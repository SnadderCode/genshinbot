const axios = require("axios");
const cheerio = require("cheerio");

const URL = "https://www.crimsonwitch.com/codes/Genshin_Impact";

async function getCodes() {
	try {
		const response = await axios.get(URL, {
			timeout: 10000,
		});

		const $ = cheerio.load(response.data);

		let script;

		$("script").each((_, element) => {
			const content = $(element).html();

			if (content && content.includes("initialCodes")) {
				script = content;
			}
		});

		if (!script) {
			throw new Error("initialCodes script not found");
		}

		const regex = /\\"initialCodes\\":(\[[\s\S]*?\]),\\"slug\\"/;
		const match = script.match(regex);

		if (!match) {
			throw new Error("initialCodes data not found");
		}

		const jsonString = match[1].replace(/\\"/g, '"');

		let codesData;

		try {
			codesData = JSON.parse(jsonString);
		} catch (error) {
			throw new Error(`Failed to parse initialCodes JSON: ${error.message}`);
		}

		const codes = new Map();

		for (const codeData of codesData) {
			if (!codeData?.code) {
				continue;
			}

			const code = codeData.code.trim();

			// Ignore livestream-related entries.
			if (code.toLowerCase().includes("livestream")) {
				continue;
			}

			const rewards = [];

			if (Array.isArray(codeData.rewards)) {
				for (const reward of codeData.rewards) {
					if (!reward?.item || reward.qty == null) {
						continue;
					}

					rewards.push({
						item: reward.item,
						quantity: reward.qty,
					});
				}
			}

			codes.set(code, rewards);
		}

		return codes;
	} catch (error) {
		console.error(`[Crimson Witch] Failed to fetch codes: ${error.message}`);

		return new Map();
	}
}

module.exports = {
	name: "Crimson Witch",
	getCodes,
};
