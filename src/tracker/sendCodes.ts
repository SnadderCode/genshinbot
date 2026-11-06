import type { MessageCreateOptions } from "discord.js";
import type { Code } from "./Code";
import { buildCodeMessage } from "./codeMessageBuilder";

export type SendableChannel = { send(options: MessageCreateOptions): Promise<unknown> };

export async function sendCodesToDiscord(codes: Code[], channel: SendableChannel): Promise<void> {
	for (const code of codes) {
		const message = buildCodeMessage(code);
		await channel.send(message);
	}
}
