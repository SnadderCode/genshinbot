import {Events, type Client} from "discord.js";
import {findNewCodes, saveNewCodes} from "../tracker/codeTracker";
import {sendCodesToDiscord, type SendableChannel} from "../tracker/sendCodes";

const interval = 60_000;

async function sendNewCodes(channel: SendableChannel): Promise<void> {
	try {
		const newCodes = await findNewCodes();
		if (newCodes.length === 0) {
			console.log("[Code Tracker] No new codes found.");
			return;
		}
		console.log(`[Code Tracker] Found ${newCodes.length} new code(s).`);
		await sendCodesToDiscord(newCodes, channel);
		await saveNewCodes(newCodes);
		console.log(`[Code Tracker] Successfully sent ${newCodes.length} code(s).`);
	} catch (error) {
		console.error("[Code Tracker] Failed to check codes:", error);
	}
}

export default {
	name: Events.ClientReady,
	once: true,
	async execute(client: Client): Promise<void> {
		try {
			const channelId = process.env.CHANNEL_ID;
			if (!channelId) throw new Error("CHANNEL_ID is not configured");
			const channel = await client.channels.fetch(channelId);
			if (!channel?.isTextBased() || !("send" in channel))
				throw new Error("Configured channel cannot receive messages");
			void sendNewCodes(channel as SendableChannel);
			setInterval(() => void sendNewCodes(channel as SendableChannel), interval);
		} catch (error) {
			console.error("[Discord] Failed to initialize:", error);
		}
	},
};
