# mcmotd
A Discord bot written in NodeJS. This bot can be used to run !ping <domain/ip> in a Discord channel and get a direct response from a Minecraft server. 
The response includes the favicon, ip, player count, description, color scheme, version, and timestamp.

# Dependencies
- NodeJS
- npm

# Setup
1. Clone the repo with: `git clone https://github.com/kNoAPP/mcmotd.git`
2. Navigate to the project folder, open a shell
3. Install the node_modules with with: `npm install`
4. Get your MongoDB URI and Discord token info ready.
5. Input this information in the setup script: `node setup` (Note, if you don't want to use MongoDB, leave the URI field blank)
6. Start the bot with `npm start`
7. Add the Discord bot to a server and type !ping <domain/ip> (ex. !ping mcdiamondfire.com)
