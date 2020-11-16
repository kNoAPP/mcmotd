const { Client, MessageEmbed, MessageAttachment } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const net = require('net');
const { PacketOutUtil, PacketInUtil } = require('./util/NetworkUtil');
const { token, mongoURI } = require('./config.json');

const client = new Client();

function pingServer(host, port, protocol, timeout) {
    return new Promise((resolve, reject) => {
        const socket = new net.createConnection({host: host, port: port});
        socket.setNoDelay(true);

        const timeoutHandler = setTimeout(() => {
            socket.emit('error', new Error('No response from server.'));
        }, timeout);

        socket.on('connect', () => {
            // See: https://wiki.vg/Server_List_Ping
            const handshake = new PacketOutUtil(); // Handshake packet first
            handshake.writeVarInt(0);
            handshake.writeVarInt(protocol);
            handshake.writeString(host);
            handshake.writeUShort(port);
            handshake.writeVarInt(1);
            socket.write(handshake.build());

            const request = new PacketOutUtil(); // Then the request packet
            request.writeVarInt(0);
            socket.write(request.build());
        });

        const response = new PacketInUtil();
        socket.on('data', (data) => {
            response.concat(data);

            if(!response.isReady()) {
                return;
            }
            clearTimeout(timeoutHandler);
            socket.destroy();

            const packetId = response.readVarInt();
            if(packetId !== 0) { // Handshake should be 0.
                reject(new Error("Invalid packet id sent: " + packetId));
                return;
            }

            const jsonResponse = JSON.parse(response.readString());
            jsonResponse.ip = host.toLowerCase() + ":" + port;
            resolve(jsonResponse);
            if(mongoURI) {
                MongoClient.connect(mongoURI, { useUnifiedTopology: true }, (err, db) => {
                    if(err)
                        throw err;

                    const dbo = db.db('discord-bot');
                    dbo.collection('pings').replaceOne({ ip: jsonResponse.ip }, jsonResponse, { upsert: true }, (err, result) => {
                        if(err)
                            throw err;

                        db.close();
                    });
                });
            }
        });

        socket.on('error', (error) => {
            clearTimeout(timeoutHandler);
            socket.destroy();
            reject(error);
        });
    });
}

function faviconToBuffer(favicon) {
    const matches = favicon.match(/^data:.+\/(.+);base64,(.*)$/);
    return Buffer.from(matches[2], 'base64');
}

client.once('ready', () => {
    console.log('Ready!');
});

client.on('message', message => {
    const msg = message.content.trim().toLowerCase();
    if(msg.substr(0, 6) === '!ping ') {
        const ip = msg.substr(6);
        const validIpAddressRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
        const validHostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
        if(!(ip.match(validIpAddressRegex) || ip.match(validHostnameRegex))) {
            message.channel.send(`${message.author} I can\'t ping that. Sorry!`);
            return;
        }

        console.log(`${message.author.tag}: Ping ${ip}`);
        pingServer(ip, 25565, 753, 3000)
            .then(result => {
                const embed = new MessageEmbed();
                if(result.favicon) {
                    const attachment = new MessageAttachment(faviconToBuffer(result.favicon));
                    embed.attachFiles(attachment);
                }
                embed.setTimestamp(Date.now());
                embed.setURL(`https://${ip}`);
                embed.setTitle(ip);
                embed.setAuthor(`${result.players.online} / ${result.players.max}`)
                embed.setFooter(result.version.name);

                const colorCodeCleaner = /§./g;
                let color = null;
                const desc = [result.description.text];
                if(result.description.extra) {
                    for(let part of result.description.extra) {
                        if(part.text)
                            desc.push(part.text);
                        if(!color && part.color)
                            color = part.color.toUpperCase();
                    }
                }
                embed.setColor(color ? color : `RANDOM`);
                embed.setDescription(desc.join("").replace(colorCodeCleaner, ''));

                message.channel.send(embed);
            }).catch(error => {
                message.channel.send(`${ip} -> ` + error.toString().substring(0, 2000));
            });
    }
});

client.login(token);
