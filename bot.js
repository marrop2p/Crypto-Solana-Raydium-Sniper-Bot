/**
 *
 * SCANNING FOR NEW LIQUIDITY POOLS CREATED ON RAYDIUM DEX
 */
const {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
} = require("@solana/web3.js");
const raydiumConnect = require("raydium-bridge");
const {
  Liquidity,
  jsonInfo2PoolKeys,
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
  publicKey,
  TokenAmount,
  Token,
  Percent,
} = require("@raydium-io/raydium-sdk");

const RAYDIUM_LIQUIDITY_JSON =
  "https://api.raydium.io/v2/sdk/liquidity/mainnet.json";
const RAY_SOL_LP_V4_POOL_KEY = "89ZKE4aoyfLBe2RuV6jM3JGNhaV18Nxh8eNtjRcndBip";

const RAYDIUM_PUBLIC_KEY = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"; // taken from https://docs.raydium.io/raydium/protocol/developers/addresses
const ADDRESS_OF_INPUT_TOKEN = "So11111111111111111111111111111111111111112"; // Contract Address of Token with which you will buy (default address of SOL, probably you will use it and no need to change)
const ADDRESS_OF_OUTPUT_TOKEN = "AQoKYV7tYpTrFZN6P5oUufbQKAUr9mNYGe1TTJC9wajM"; // Contract Address of the token you want to snipe
const AMOUNT_TO_BE_USED_TO_BUY = 5; // Amount of the Input Token (5 SOL)
const SLIPPAGE_PERCENT = 5; // Slippage in percents
const TRY_SNIPE_ANY = true; // Try to snipe any for good deal

const privateKey = "ENTER-PRIVATE-KEY-HERE"; // Private Key of Sender/Receiver Address to sing transaciton/receive reward

const SESSION_HASH = "TIRLA" + Math.ceil(Math.random() * 1e9);
const raydium = new PublicKey(RAYDIUM_PUBLIC_KEY);
const signer = raydiumConnect.wallet(privateKey, RAYDIUM_LIQUIDITY_JSON);

const connection = new Connection("https://api.mainnet-beta.solana.com", {
  wsEndpoint: "wss://api.mainnet-beta.solana.com",
  httpHeaders: { "x-session": SESSION_HASH },
});

//monitor logs
async function StartSniping(connection, raydium) {
  console.log("Monitoring logs...");

  connection.onLogs(
    raydium,
    ({ logs, err, signature }) => {
      if (err) return;
      if (logs && logs.some((log) => log.includes("initialize"))) {
        console.log("Signature for Initialize:", signature);
        SnipeRaydiumToken(signature, connection);
      }
    },
    "finalized"
  );
}

async function SnipeRaydiumToken(signature, connection) {
  const txId = signature;

  const tx = await connection.getParsedTransaction(txId, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  const accounts = tx?.transaction?.message?.instructions.find(
    (ix) =>
      ix.programId.toBase58() ===
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4" ||
      ix.programId.toBase58().includes("AToken")
  ).accounts;

  if (!accounts) {
    console.log("No accounts found");
    return;
  }
  const tokenAIndex = 8;
  const tokenBIndex = 9;

  const tokeAAccount = accounts[tokenAIndex];
  const tokenBAccount = accounts[tokenBIndex];

  const displayData = [
    { Token: "Token A", account: tokeAAccount },
    { Token: "Token B", account: tokenBAccount },
  ];
  console.log("New LP Found");
  console.log(generateExplorerUrl(txId));
  console.table(displayData);

  const tokenAAdress = tokeAAccount.toBase58();
  const tokenBAdress = tokenBAccount.toBase58();

  if (
    tokenAAdress === ADDRESS_OF_OUTPUT_TOKEN &&
    tokenBAdress !== ADDRESS_OF_INPUT_TOKEN
  ) {
    console.log(`Only first token of Pair is the token expected`);
    await sleep(2000);
    return;
  }
  if (
    tokenAAdress !== ADDRESS_OF_OUTPUT_TOKEN &&
    tokenBAdress === ADDRESS_OF_INPUT_TOKEN
  ) {
    console.log(`Only second token of Pair is the token expected`);
    await sleep(2000);
    return;
  }

  await Swap(tokenAAdress, tokenAAdress);
  await sleep(2000);
}

function generateExplorerUrl(txId) {
  return `https://solscan.io/tx/${txId}?cluster=mainnet`;
}

async function Swap(tokenIn, tokenOut) {
  const liquidityJsonResp = await fetch(RAYDIUM_LIQUIDITY_JSON);
  if (liquidityJsonResp.status === 429) {
    console.log("Wait a bit, you using service to often!!!");
    return;
  }
  const liquidityJson = await liquidityJsonResp.json();
  const allPoolKeysJson = [
    ...(liquidityJson?.official ?? []),
    ...(liquidityJson?.unOfficial ?? []),
  ];
  const poolKeysRaySolJson =
    allPoolKeysJson.filter(
      (item) => item.lpMint === RAY_SOL_LP_V4_POOL_KEY
    )?.[0] || null;

  const raySolPk = jsonInfo2PoolKeys(poolKeysRaySolJson);

  const wallet = Keypair.fromSecretKey(privateKey);

  const tokenAccounts = await getTokenAccountsByOwner(
    connection,
    wallet.publicKey
  );

  const { amountIn, minAmountOut } = await calcAmountOutAsync(
    connection,
    raySolPk,
    AMOUNT_TO_BE_USED_TO_BUY,
    true
  );

  const instruction = Liquidity.makeSwapFixedInInstruction(
    {
      poolKeys: raySolPk,
      userKeys: {
        tokenAccounts,
        owner: publicKey,
      },
      amountIn: amountIn.raw,
      minAmountOut: minAmountOut.raw,
    },
    4
  );

  instruction.programId = TOKEN_PROGRAM_ID;
  const transaction = new VersionedTransaction();
  transaction.add(instruction);
  const txid = await connection.sendTransaction(transaction, [signer]);

  console.log("Swap txdId", txid);
}

async function getTokenAccountsByOwner(connection, owner) {
  const tokenResp = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  const accounts = [];

  for (const { pubkey, account } of tokenResp.value) {
    accounts.push({
      pubkey,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
    });
  }

  return accounts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const calcAmountOutAsync = async (
  connection,
  poolKeys,
  rawAmountIn,
  swapInDirection
) => {
  const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys });
  let currencyInMint = poolKeys.baseMint;
  let currencyInDecimals = poolInfo.baseDecimals;
  let currencyOutMint = poolKeys.quoteMint;
  let currencyOutDecimals = poolInfo.quoteDecimals;

  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint;
    currencyInDecimals = poolInfo.quoteDecimals;
    currencyOutMint = poolKeys.baseMint;
    currencyOutDecimals = poolInfo.baseDecimals;
  }

  const currencyIn = new Token(
    TOKEN_PROGRAM_ID,
    currencyInMint,
    currencyInDecimals
  );
  const amountIn = new TokenAmount(currencyIn, rawAmountIn, false);
  const currencyOut = new Token(
    TOKEN_PROGRAM_ID,
    currencyOutMint,
    currencyOutDecimals
  );
  const slippage = new Percent(SLIPPAGE_PERCENT, 100); // 5% slippage

  const {
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  } = Liquidity.computeAmountOut({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage,
  });

  return {
    amountIn,
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  };
};

(async () => {
  try {
    await StartSniping(connection, raydium);
  } catch (e) {
    console.log("err", e);
  }
})();
