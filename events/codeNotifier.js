// events/codeNotifier.js
const {
	getActivePromoCodes,
	getOldCodes,
	saveCodes,
} = require("../functions/codeFunctions");

const {
	TextDisplayBuilder,
	SectionBuilder,
	ButtonBuilder,
	ButtonStyle,
	MessageFlags,
} = require("discord.js");

const channelId = "1461048653841043488";
const POLL_INTERVAL_MS = 60_000; // 1 minute

function formatRewardsForDisplay(rewardArr) {
	try {
		if (!Array.isArray(rewardArr) || rewardArr.length === 0) return "Unknown";
		return rewardArr
			.map(rewardMap => {
				if (!(rewardMap instanceof Map)) return "Unknown x1";
				const [item, qty] = [...rewardMap.entries()][0] || ["Unknown", 1];
				return `${item} x${qty}`;
			})
			.join(", ");
	} catch (e) {
		console.warn("[formatRewardsForDisplay] error:", e.message);
		return "Unknown";
	}
}

async function sendNew(client) {
	try {
		const oldCodes = await getOldCodes();
		const codes = await getActivePromoCodes();

		if (!codes || !(codes instanceof Map) || codes.size === 0) {
			console.log("[sendNew] no active codes found.");
			return;
		}

		const newCodes = [];
		for (const code of codes.keys()) {
			if (!oldCodes.includes(code)) newCodes.push(code);
		}

		if (newCodes.length === 0) {
			console.log("[sendNew] no new codes available.");
			return;
		}

		await saveCodes(newCodes);

		const channel = await client.channels.fetch(channelId).catch(err => {
			throw new Error(`Failed to fetch channel ${channelId}: ${err.message}`);
		});

		for (const code of newCodes) {
			try {
				const button = new ButtonBuilder()
					.setLabel("Redeem")
					.setStyle(ButtonStyle.Link)
					.setURL(`https://genshin.mihoyo.com/en/gift?code=${encodeURIComponent(code)}`);

				const header = new TextDisplayBuilder().setContent(`### New code available: ${code}`);

				const rewardText = formatRewardsForDisplay(codes.get(code));
				const text = new TextDisplayBuilder().setContent(`Rewards: ${rewardText}`);

				const section = new SectionBuilder();
				section.addTextDisplayComponents(header, text);
				section.setButtonAccessory(button);

				await channel.send({ components: [section], flags: MessageFlags.IsComponentsV2 });
				console.log(`[sendNew] Sent new code: ${code}`);
			} catch (inner) {
				console.error(`[sendNew] failed sending notification for ${code}:`, inner.message);
			}
		}
	} catch (err) {
		console.error("[sendNew] error:", err.message);
	}
}

module.exports = {
	name: "clientReady",
	once: true,
	async execute(client) {
		try {
			// run once immediately and then schedule
			await sendNew(client);
			setInterval(() => {
				sendNew(client).catch(e => console.error("[scheduled sendNew] uncaught error:", e));
			}, POLL_INTERVAL_MS);
		} catch (e) {
			console.error("[codeNotifier execute] fatal error:", e);
		}
	},
};
