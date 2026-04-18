const {getActivePromoCodes, getOldCodes, saveCodes} = require("../functions/codeFunctions");

const {
	TextDisplayBuilder,
	SectionBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
} = require("discord.js");

const channelId = "1461048653841043488";

async function sendNew(client) {
	const oldCodes = await getOldCodes();

	const codes = await getActivePromoCodes();

	const newCodes = new Array();

	for (const code of codes.keys()) {
		if (oldCodes.includes(code)) {
			continue;
		}
		newCodes.push(code);
	}
	if (newCodes.length <= 0) {
		console.log("No new codes available.");
		return;
	}

  await saveCodes(newCodes);

	try {
		const channel = await client.channels.fetch(channelId);

		for (const code of newCodes) {
			const button = new ButtonBuilder()
				.setLabel("redeem")
				.setStyle(ButtonStyle.Link)
				.setURL(`https://genshin.mihoyo.com/en/gift?code=${code}`);
			const header = new TextDisplayBuilder().setContent(`### New code available: ${code}`);
			const text = new TextDisplayBuilder().setContent(`Rewards:${[...codes.get(code)].map((reward) => `${[...reward.entries()][0][0]} x${[...reward.entries()][0][1]}`).join(", ")}`);
			const section = new SectionBuilder();

			section.addTextDisplayComponents(header, text);
			section.setButtonAccessory(button);

			await channel.send({components: [section], flags: MessageFlags.IsComponentsV2});

			console.log(`Sent new code: ${code}`);
		}
	} catch (e) {
		console.error(e);
		return;
	}
	
}

module.exports = {
	name: "clientReady",
	once: true,
	async execute(client) {
		try {
			setInterval(function () {
				sendNew(client);
			}, 1000 * 60);
		} catch (e) {
			console.error(e);
		}
	},
};
