import "dotenv/config";
import { Client, Collection, Events, GatewayIntentBits, Partials, type ChatInputCommandInteraction, type ClientEvents } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type EventModule = {
	name: keyof ClientEvents;
	once?: boolean;
	execute: (...args: any[]) => unknown;
};

type LoadedCommand = {
	data: { name: string };
	execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
};

async function main(): Promise<void> {
	const discordToken = process.env.DISCORD_TOKEN;
	if (!discordToken) throw new Error("DISCORD_TOKEN is not configured");

	const client = new Client({
		intents: Object.values(GatewayIntentBits).filter(
			(intent): intent is GatewayIntentBits => typeof intent === "number",
		),
		partials: [Partials.Message, Partials.Channel, Partials.Reaction],
	});

	const commands = new Collection<string, LoadedCommand>();
	const commandsPath = path.join(__dirname, "commands");
	const commandFiles = fs.readdirSync(commandsPath).filter(
		(file) => (file.endsWith(".ts") || file.endsWith(".js")) && !file.endsWith(".d.ts"),
	);

	for (const file of commandFiles) {
		const filePath = pathToFileURL(path.join(commandsPath, file)).href;
		const command = (await import(filePath)) as {
			data?: { name: string };
			execute?: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
		};
		if (!command.data?.name || typeof command.execute !== "function") {
			console.warn(`[Discord] Command file ${file} is missing required data or execute exports.`);
			continue;
		}
		commands.set(command.data.name, command as LoadedCommand);
	}

	const eventsPath = path.join(__dirname, "events");
	const register = (client.once.bind(client) as (name: string, listener: (...args: any[]) => void) => unknown);
	const registerAlways = (client.on.bind(client) as (name: string, listener: (...args: any[]) => void) => unknown);

	for (const file of fs.readdirSync(eventsPath)) {
		if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
		const imported = await import(pathToFileURL(path.join(eventsPath, file)).href);
		const event = imported.default as Partial<EventModule> | undefined;
		if (!event?.name || typeof event.execute !== "function") {
			console.warn(`[Discord] Event file ${file} is missing required properties`);
			continue;
		}

		const executeEvent = event.execute;
		const listener = (...args: any[]) => void executeEvent(...args, client);
		if (event.once) register(event.name, listener);
		else registerAlways(event.name, listener);
	}

	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isChatInputCommand()) return;
		const command = commands.get(interaction.commandName);
		if (!command) return;

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`[Discord] Failed to run /${interaction.commandName}:`, error);
			const response = {
				content: "I couldn't run that command. Please try again later.",
				ephemeral: true,
			};
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp(response);
			} else {
				await interaction.reply(response);
			}
		}
	});

	client.once(Events.ClientReady, (readyClient) => {
		console.log(`Ready! Logged in as ${readyClient.user.tag}`);
	});

	await client.login(discordToken);
}

void main().catch((error: unknown) => {
	console.error("[Discord] Failed to start:", error);
	process.exitCode = 1;
});
