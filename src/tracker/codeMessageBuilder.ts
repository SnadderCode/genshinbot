import {
	ButtonBuilder,
	ButtonStyle,
	TextDisplayBuilder,
	SectionBuilder,
	MessageFlags,
	type MessageCreateOptions,
} from "discord.js";
import type {Code} from "./Code";

export function buildCodeMessage(code: Code): MessageCreateOptions {
	const codeText = code.getCode();
	const button = new ButtonBuilder()
		.setLabel("redeem")
		.setStyle(ButtonStyle.Link)
		.setURL(`https://genshin.mihoyo.com/en/gift?code=${encodeURIComponent(codeText)}`);
	const header = new TextDisplayBuilder().setContent(`### New code available: ${codeText}`);
	const rewardText = code
		.getRewards()
		.map((reward) => `${reward.getItem()} x${reward.getQuantity()}`)
		.join(", ");
	const text = new TextDisplayBuilder().setContent(`Rewards: ${rewardText || "No rewards listed"}`);
	const section = new SectionBuilder()
		.addTextDisplayComponents(header, text)
		.setButtonAccessory(button);
	return {components: [section], flags: MessageFlags.IsComponentsV2};
}
