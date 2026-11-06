import {Code} from "../tracker/Code";
import {Reward} from "../tracker/Reward";

const URL =
	"https://genshin-impact.fandom.com/api.php?action=query&titles=Promotional_Code&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*";
type WikiResponse = {
	query?: {pages?: Record<string, {revisions?: Array<{slots?: {main?: {"*"?: string}}}>}>};
};

async function getCodes(): Promise<Code[]> {
	try {
		const response = await fetch(URL, {signal: AbortSignal.timeout(10000)});
		if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
		const data = (await response.json()) as WikiResponse;
		const pages = data.query?.pages;
		if (!pages) throw new Error("No pages found in API response");
		const pageContent = pages[Object.keys(pages)[0]]?.revisions?.[0]?.slots?.main?.["*"];
		if (!pageContent) throw new Error("Page content not found");
		const start = pageContent.indexOf("Code Row<!--");
		const end = pageContent.lastIndexOf("Code Row/Footer");
		if (start === -1 || end <= start) throw new Error("Code table could not be located");
		const codes = [];
		for (const rawData of pageContent.slice(start, end).split("Code Row").slice(1)) {
			try {
				const fields = rawData.split("|");
				if (fields.length < 2) continue;
				fields.shift();
				const code = fields.shift()?.trim();
				if (!code) continue;
				if (fields.length > 0 && !fields[0].includes(";")) fields.shift();
				if (fields.length === 0) continue;
				const rewards = fields[0].split(";").flatMap((rawReward) => {
					const [itemPart, quantityPart] = rawReward.split("*");
					const quantity = quantityPart?.match(/\d+/)?.[0];
					const item = itemPart?.trim();
					return item && quantity ? [new Reward(item, Number(quantity))] : [];
				});
				codes.push(new Code(code, rewards));
			} catch (error) {
				console.error("[Genshin Impact Wiki] Failed to parse code row:", error);
			}
		}
		return codes;
	} catch (error) {
		console.error("[Genshin Impact Wiki] Failed to fetch codes:", error);
		return [];
	}
}

export default {name: "Genshin Impact Wiki", getCodes};
