
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags, Partials} = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const discordToken = process.env.DISCORD_TOKEN;

const client = new Client({
	intents: Object.values(GatewayIntentBits),
	partials: [
		Partials.Message,
		Partials.Channel,
		Partials.Reaction
	]
});

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const event = require(path.join(eventsPath, file));
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(discordToken);