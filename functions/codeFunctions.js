// functions/codeFunctions.js
const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const DATA_DIR = path.resolve(__dirname, "../data");
const filePath = path.join(DATA_DIR, "codes.txt");
const format = /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
const AXIOS_DEFAULT_TIMEOUT = 10_000; // 10s
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDataFile() {
	try {
		await fs.mkdir(DATA_DIR, { recursive: true });
		await fs.access(filePath).catch(async () => {
			await fs.writeFile(filePath, "", "utf8");
		});
	} catch (e) {
		console.error("[ensureDataFile] error:", e);
		throw e;
	}
}

async function safeAxiosGet(url, opts = {}) {
	const config = { timeout: AXIOS_DEFAULT_TIMEOUT, ...opts };
	for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
		try {
			const resp = await axios.get(url, config);
			return resp;
		} catch (err) {
			const last = attempt === RETRY_COUNT;
			console.warn(`[safeAxiosGet] attempt ${attempt + 1} failed for ${url}: ${err.message}`);
			if (last) {
				throw err;
			}
			await delay(RETRY_DELAY_MS * (attempt + 1));
		}
	}
}

function parseRewardsFromFandomSegment(segment) {
	if (!segment || typeof segment !== "string") return [];
	const rewardItems = segment.split(";").map(s => s.trim()).filter(Boolean);
	const rewards = [];

	for (const rawReward of rewardItems) {
		const [itemPart, qtyPart] = rawReward.split("*").map(s => s && s.trim());
		if (!itemPart) continue;
		const qtyMatch = (qtyPart || "").match(/^\d+/);
		const qty = qtyMatch ? Number(qtyMatch[0]) : 1;
		const rewardMap = new Map();
		rewardMap.set(itemPart, qty);
		rewards.push(rewardMap);
	}
	return rewards;
}

async function getActiveFandomCodes() {
	const url =
		"https://genshin-impact.fandom.com/api.php?action=query&titles=Promotional_Code&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*";

	try {
		const resp = await safeAxiosGet(url);
		const data = resp && resp.data;
		if (!data || !data.query || !data.query.pages) return new Map();

		const pages = data.query.pages;
		const pageID = Object.keys(pages)[0];
		const revisions = pages[pageID] && pages[pageID].revisions;
		if (!revisions || !revisions[0] || !revisions[0].slots || !revisions[0].slots.main) return new Map();

		const pageContent = revisions[0].slots.main["*"] || "";
		const start = pageContent.indexOf("Code Row<!--");
		const end = pageContent.lastIndexOf("Code Row/Footer");

		if (start === -1 || end === -1 || end <= start) return new Map();

		const trimmed = pageContent.slice(start, end);
		const rawList = trimmed.split("Code Row").map(s => s.trim()).filter(Boolean);

		const codes = new Map();

		for (const rawDataCode of rawList) {
			try {
				const parts = rawDataCode.split("|").map(s => s.trim()).filter(Boolean);
				if (parts.length === 0) continue;

				// Heuristic to find code and reward segment
				let code = parts.find(p => p && !p.includes("=") && !p.toLowerCase().includes("row") && p.length <= 64) || parts[0];
				code = (code || "").replace(/<!--.*?-->/g, "").trim();
				if (!code || format.test(code)) continue;

				let rewardSegment = parts.find(p => p.includes(";") || p.includes("*")) || parts[1] || "";
				const rewards = parseRewardsFromFandomSegment(rewardSegment);

				if (rewards.length > 0) codes.set(code, rewards);
			} catch (innerErr) {
				console.warn("[getActiveFandomCodes] skip entry due to parse issue:", innerErr.message);
				continue;
			}
		}
		return codes;
	} catch (err) {
		console.error("[getActiveFandomCodes] error:", err.message);
		return new Map();
	}
}

async function getActiveCrimsonCodes() {
	const url = "https://www.crimsonwitch.com/codes/Genshin_Impact";
	try {
		const resp = await safeAxiosGet(url, { responseType: "text" });
		const $ = cheerio.load(resp.data);
		let script = null;

		$("script").each((i, el) => {
			const content = $(el).html();
			if (content && content.includes("initialCodes")) script = content;
		});

		if (!script) {
			console.warn("[getActiveCrimsonCodes] script with initialCodes not found");
			return new Map();
		}

		const regex = /\\"initialCodes\\":(\[[\s\S]*?\]),\\"slug\\"/;
		const match = script.match(regex);
		if (!match || !match[1]) {
			console.warn("[getActiveCrimsonCodes] initialCodes not found in script content");
			return new Map();
		}

		const jsonString = match[1].replace(/\\"/g, '"');
		let codesDict;
		try {
			codesDict = JSON.parse(jsonString);
		} catch (e) {
			console.error("[getActiveCrimsonCodes] failed to parse JSON:", e.message);
			return new Map();
		}

		const codes = new Map();

		for (const c of codesDict) {
			try {
				if (!c || !c.code) continue;
				const rawCode = String(c.code).trim();
				if (!rawCode || rawCode.toLowerCase().includes("livestream")) continue;

				const codeRewards = Array.isArray(c.rewards)
					? c.rewards.map(r => {
							const rewardMap = new Map();
							const item = r.item ?? r.name ?? null;
							const qty = Number(r.qty ?? r.quantity ?? 1) || 1;
							if (item) rewardMap.set(String(item), qty);
							return rewardMap;
					  }).filter(m => m.size > 0)
					: [];

				if (codeRewards.length > 0) codes.set(rawCode, codeRewards);
			} catch (inner) {
				console.warn("[getActiveCrimsonCodes] skip corrupt entry:", inner.message);
			}
		}
		return codes;
	} catch (err) {
		console.error("[getActiveCrimsonCodes] error:", err.message);
		return new Map();
	}
}

async function getActivePromoCodes() {
	try {
		const [fandomCodes, crimsonCodes] = await Promise.all([
			getActiveFandomCodes(),
			getActiveCrimsonCodes(),
		]);
		return new Map([...(fandomCodes || new Map()), ...(crimsonCodes || new Map())]);
	} catch (err) {
		console.error("[getActivePromoCodes] error:", err.message);
		return new Map();
	}
}

async function getOldCodes() {
	try {
		await ensureDataFile();
		const raw = await fs.readFile(filePath, "utf8");
		return raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
	} catch (err) {
		console.error("[getOldCodes] error reading file:", err.message);
		return [];
	}
}

async function saveCodes(codes) {
	try {
		if (codes == null) return;
		await ensureDataFile();

		let codeList;
		if (codes instanceof Map) codeList = [...codes.keys()];
		else if (Array.isArray(codes)) codeList = codes.map(String);
		else if (typeof codes === "object") codeList = Object.keys(codes).map(String);
		else codeList = [String(codes)];

		const oldCodes = await getOldCodes();
		const toAppend = codeList.filter(c => c && !oldCodes.includes(c));

		if (toAppend.length === 0) return;

		const data = toAppend.map(c => `${c}\r\n`).join("");
		await fs.appendFile(filePath, data, "utf8");
	} catch (err) {
		console.error("[saveCodes] error:", err.message);
		throw err;
	}
}

module.exports = {
	getActivePromoCodes,
	getActiveFandomCodes,
	getActiveCrimsonCodes,
	getOldCodes,
	saveCodes,
};
