const {findNewCodes, saveNewCodes} = require("../tracker/codeTracker");

const {sendCodesToDiscord} = require("../tracker/sendCodes");

require("dotenv").config();

const interval = 1000 * 60; // 1 minute



async function sendNewCodes(channel) {
	try {


		const newCodes = await findNewCodes();

		if (newCodes.size === 0) {
			console.log("[Code Tracker] No new codes found.");
			return;
		}

		console.log(`[Code Tracker] Found ${newCodes.size} new code(s).`);

		await sendCodesToDiscord(newCodes, channel);

		await saveNewCodes(newCodes);

		console.log(`[Code Tracker] Successfully sent ${newCodes.size} code(s).`);
	} catch (error) {
		console.error("[Code Tracker] Failed to check codes:", error);
	}
}

module.exports = {
	name: "clientReady",
	once: true,
	async execute(client) {
		try {
      const channel = await client.channels.fetch(process.env.CHANNEL_ID);
      sendNewCodes(channel);
			setInterval(function () {
				sendNewCodes(channel);
			}, interval);
		} catch (error) {
        console.error(
            "[Discord] Failed to initialize:",
            error
        );
		}
	},
};
