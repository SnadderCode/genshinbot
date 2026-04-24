module.exports = {getActivePromoCodes, getOldCodes, saveCodes};

const fs = require("fs");
const {type} = require("os");
const axios = require("axios");
const cheerio = require("cheerio");

const filePath = "./data/codes.txt";

async function getActivePromoCodes() {
	const fandomCodes = await getActiveFandomCodes() || new Map();
	const crimsonCodes = await getActiveCrimsonCodes() || new Map();
	const codes = new Map([...fandomCodes, ...crimsonCodes])
	return codes;
}

async function getActiveFandomCodes() {
	const url =
		"https://genshin-impact.fandom.com/api.php?action=query&titles=Promotional_Code&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*";
	const response = await fetch(url);
	const data = await response.json();

	const pages = data.query.pages;
	const pageID = Object.keys(pages)[0];

	const pageContent = pages[pageID].revisions[0].slots.main["*"];

	const start = pageContent.indexOf("Code Row<!--");
	const end = pageContent.lastIndexOf("Code Row/Footer");

	const timmedPageContent = pageContent.slice(start, end - 2);

	const rawList = timmedPageContent.split("Code Row");

	if (rawList.length < 1) {
		return undefined;
	}
	rawList.shift();

	const codes = new Map();

	for (const rawDataCode of rawList) {
		const rawDataCodeInner = rawDataCode.split("|");

		if (rawList.length < 1) {
			continue;
		}
		rawDataCodeInner.shift();

		const code = rawDataCodeInner.shift();

		if (!rawDataCodeInner[0].includes(";")) {
			rawDataCodeInner.shift();
		}

		const rewardString = rawDataCodeInner[0].split(";");

		const rewards = new Array();

		for (const rawReward of rewardString) {
			const reward = new Map();

			let [item, quanity] = rawReward.split("*");

			quanity = quanity.match(/^\d+/)[0];

			reward.set(item, quanity);
			rewards.push(reward);
		}
		codes.set(code, rewards);
	}

	return codes;
}

async function getOldCodes() {
	return await fs.readFileSync(filePath, "utf-8").split("\r\n");
}

async function saveCodes(codes) {
	const oldCodes = await getOldCodes();

	let codeList;

	if (typeof codes === "undefined") {
		return;
	} else if (typeof codes === "object" && codes !== null) {
		if (codes instanceof Map) {
			codeList = [...codes.keys()];
		} else if (Array.isArray(codes)) {
			codeList = codes;
		} else {
			codeList = Object.keys(codes);
		}
	} else {
		codeList = [codes];
	}

	for (const code of codeList) {
		if ((await oldCodes).includes(code)) {
			continue;
		}

		fs.appendFile(filePath, code + "\r\n", function (err) {
			if (err) throw err;
		});
	}
	return;
}

async function getActiveCrimsonCodes() {
	let script;

	try {
		const response = await axios.get("https://www.crimsonwitch.com/codes/Genshin_Impact");
		const $ = cheerio.load(response.data);

		$("script").each((i, el) => {
			const content = $(el).html();
			if (content && content.includes("initialCodes")) script = content;
		});
	} catch (error) {
		console.error("Error:", error.message);
	}
	if (!script) {
		console.error("Script not found");
		return;
	}
	const regex = /\\"initialCodes\\":(\[[\s\S]*?\]),\\"slug\\"/;
	const match = script.match(regex);
	if (!match) {
		console.error("initialCodes not found");
		return;
	}
	jsonString = match[1].replace(/\\"/g, '"');
	const codesDict = JSON.parse(jsonString);

	const codes = new Map();

	for (const code of codesDict) {
		if (code.code.toLowerCase().includes("livestream")) {
			continue;
		}

		const codeRewards = code.rewards.map((reward) => {
			const rewardMap = new Map();
			rewardMap.set(reward.item, reward.qty);
			return rewardMap;
		});
		codes.set(code.code, codeRewards);
	}
	return codes;
}
