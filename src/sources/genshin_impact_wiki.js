const URL =
	"https://genshin-impact.fandom.com/api.php" +
	"?action=query" +
	"&titles=Promotional_Code" +
	"&prop=revisions" +
	"&rvprop=content" +
	"&rvslots=main" +
	"&format=json" +
	"&origin=*";

async function getCodes() {
	try {
		const response = await fetch(URL, {
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status} ${response.statusText}`);
		}

		const data = await response.json();

		const pages = data?.query?.pages;

		if (!pages) {
			throw new Error("No pages found in API response");
		}

		const pageID = Object.keys(pages)[0];

		if (!pageID) {
			throw new Error("Page ID not found");
		}

		const pageContent = pages[pageID]?.revisions?.[0]?.slots?.main?.["*"];

		if (!pageContent) {
			throw new Error("Page content not found");
		}

		const start = pageContent.indexOf("Code Row<!--");
		const end = pageContent.lastIndexOf("Code Row/Footer");

		if (start === -1 || end === -1 || end <= start) {
			throw new Error("Code table could not be located");
		}

		const trimmedPageContent = pageContent.slice(start, end);

		const rawList = trimmedPageContent.split("Code Row");

		rawList.shift();

		const codes = new Map();

		for (const rawData of rawList) {
			try {
				const fields = rawData.split("|");

				if (fields.length < 2) {
					continue;
				}

				// Remove everything before the first field.
				fields.shift();

				const code = fields.shift()?.trim();

				if (!code) {
					continue;
				}

				// Some rows contain an additional field before rewards.
				if (fields.length > 0 && !fields[0].includes(";")) {
					fields.shift();
				}

				if (fields.length === 0) {
					continue;
				}

				const rewardString = fields[0];

				const rewards = [];

				for (const rawReward of rewardString.split(";")) {
					let [item, quantity] = rawReward.split("*");

					item = item?.trim();
					quantity = quantity?.match(/\d+/)?.[0];

					if (!item || !quantity) {
						continue;
					}

					rewards.push({
						item,
						quantity: Number(quantity),
					});
				}

				codes.set(code, rewards);
			} catch (error) {
				console.error(`[Genshin Impact Wiki] Failed to parse code row: ${error.message}`);
			}
		}

		return codes;
	} catch (error) {
		console.error(`[Genshin Impact Wiki] Failed to fetch codes: ${error.message}`);

		return new Map();
	}
}

module.exports = {
	name: "Genshin Impact Wiki",
	getCodes,
};
