const { ButtonBuilder, ButtonStyle, TextDisplayBuilder, SectionBuilder, MessageFlags} = require("discord.js");

async function buildCodeMessage(code, rewards) {
	const button = new ButtonBuilder()
		.setLabel("redeem")
		.setStyle(ButtonStyle.Link)
		.setURL(`https://genshin.mihoyo.com/en/gift?code=${code}`);
	const header = new TextDisplayBuilder().setContent(`### New code available: ${code}`);

	const rewardText = rewards.map((reward) => `${reward.item} x${reward.quantity}`).join(", ");

	const text = new TextDisplayBuilder().setContent(`Rewards: ${rewardText || "No rewards listed"}`);

	const section = new SectionBuilder()
		.addTextDisplayComponents(header, text)
		.setButtonAccessory(button);

	return {components: [section], flags: MessageFlags.IsComponentsV2};
}

module.exports = {
  buildCodeMessage,
};