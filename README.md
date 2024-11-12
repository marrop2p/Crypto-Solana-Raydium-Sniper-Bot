**Hey everyone,**

# Update

## I got many messages that you are not able to snipe any meme coins. This can happen for many reason: slipage, low liquidity, other bots, etc. What I like to do, is to keep 5-10 SOL, in my balance, and keep bot running for a night. This can help to find perfect moment in liquidity pool for you to be profitable and beat slippage, other bots. With low balance you are risking to be drained without profit, loose money on slippage, and gas fees. For past week (bull market baby) I was able to make good profit. Solana is booming with shitcoins. Good luck. If you have any questions, hit me.

I built a basic sniping bot for Raydium its libraries. Simply put, you fill the settings in bot.js and it buys the token for the amount you choose when it hits the swap.

**What are the features?:**

- [x] Buy early token gems with custom gas fee, slippage, amount. (DYOR)
- [x] Auto approve fees
- [x] Open source, with free node services (Literally don't have to pay anything to run this bot)

**Working on:**

- [ ] Sell bought token with custom gas fee, slippage, amount.
- [ ] Sell tokens with your custom increase in price, like 50%, 100%, 200%.

![Demo how the code looks](/images/demo.jpeg)

**HOW TO RUN**

1. clone this code or download as zip
2. $ npm install (<---- write this after you open the folder in the terminal of your favorite code editor) , this will download all npm packages. If you dont have npm installed, install node (js enviroment) https://nodejs.org/en/download.
3. Set the variables in "Variables" at the top of bot.js
4. Input enough funds for fees and purchases into your wallet

Run with "node bot.js" command in the same terminal

Stop bot with Ctrl + C.

**Successfull 20 SOL snipe the other day :)**

![Successfull Snipe](/images/IMG-20210508-WA0000.jpeg)

**TIPS AND TRICKS**

1. If you gettint error: throw new Error('Non-base' + BASE + ' character')
   ^
   Error: Non-base58 character. Make sure you have provided correct private key in line 34.
2. Have atleast few sonala's in funds, as you will need to get some fees, currencies and for the sniping itself. Also, to get everything working smooth as some tokens you will want to snipe have big slippage and if the transaction fails you still pay the gas so don't waste money
3. Check new tokens on dextools
4. DYOR on dextools and see if the token contract you are sniping doesn't have rug pulls included

**WARNING**
This bot is free and I did it as a hobby project. Great starting place for new devs. DYOR.

**TROUBLESHOOT**
If your transaction failed:

1)Your gas price is too small
2)Your slippage is too small (use 20+ for early token)
