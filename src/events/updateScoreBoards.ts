import { Events, type Client } from "discord.js";
import { ScoreBoardManager } from "../scoreboardtracker/ScoreBoardManager";

const scoreBoardManager = new ScoreBoardManager();

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client: Client): Promise<void> {
		await scoreBoardManager.updateUserStatistics();
	},
};
