import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody} from "discord.js";

type CommandModule = {
	data?: {toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody};
	execute?: (...args: unknown[]) => unknown;
};

async function deployCommands(): Promise<void> {
	const token = process.env.DISCORD_TOKEN;
	const clientId = process.env.CLIENTID;
	const guildId = process.env.GUILDID;
	if (!token || !clientId || !guildId) {
		throw new Error("DISCORD_TOKEN, CLIENTID, and GUILDID must be set in .env");
	}

	const commandsPath = path.join(__dirname, "commands");
	const commandFiles = (await fs.readdir(commandsPath)).filter(
		(file) => (file.endsWith(".ts") || file.endsWith(".js")) && !file.endsWith(".d.ts"),
	);
	const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

	for (const file of commandFiles) {
		const filePath = pathToFileURL(path.join(commandsPath, file)).href;
		const imported = (await import(filePath)) as CommandModule;
		if (!imported.data || typeof imported.execute !== "function") {
			console.warn(`[Discord] Skipping ${file}: export both data and execute.`);
			continue;
		}
		commands.push(imported.data.toJSON());
	}

	const rest = new REST({version: "10"}).setToken(token);
	const deployed = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
		body: commands,
	});
	console.log(
		`Successfully deployed ${Array.isArray(deployed) ? deployed.length : 0} guild command(s).`,
	);
}

void deployCommands().catch((error: unknown) => {
	console.error("[Discord] Failed to deploy commands:", error);
	process.exitCode = 1;
});
