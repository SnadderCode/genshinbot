import axios from "axios";
import {load} from "cheerio";
import {Code} from "../tracker/Code";
import {Reward} from "../tracker/Reward";

const URL = "https://www.crimsonwitch.com/codes/Genshin_Impact";
type CrimsonCode = {
	code?: string;
	code_variants?: string;
	rewards?: Array<{item?: string; qty?: string | number}>;
};

async function getCodes(): Promise<Code[]> {
	try {
		const response = await axios.get<string>(URL, {timeout: 10000});
		const $ = load(response.data);
		let script: string | undefined;
		$("script").each((_, element) => {
			const content = $(element).html();
			if (content?.includes("initialCodes")) script = content;
		});
		if (!script) throw new Error("initialCodes script not found");
		const match = script.match(/\\"initialCodes\\":(\[[\s\S]*?\]),\\"slug\\"/);
		if (!match) throw new Error("initialCodes data not found");
		try {
			const codesData = JSON.parse(JSON.parse(`"${match[1]}"`)) as CrimsonCode[];
			const codes = [];
			for (const codeData of codesData) {
				if (!codeData.code) continue;
				const rewards = (codeData.rewards ?? []).flatMap((reward) =>
					reward.item && reward.qty != null ? [new Reward(reward.item, Number(reward.qty))] : [],
				);
				for (const rawCode of [codeData.code, ...(codeData.code_variants?.split(",") ?? [])]) {
					const code = rawCode.trim();
					if (code && !code.toLowerCase().includes("livestream")) codes.push(new Code(code, rewards));
				}
			}
			return codes;
		} catch (error) {
			throw new Error(`Failed to parse initialCodes JSON: ${String(error)}`);
		}
	} catch (error) {
		console.error("[Crimson Witch] Failed to fetch codes:", error);
		return [];
	}
}

export default {name: "Crimson Witch", getCodes};
