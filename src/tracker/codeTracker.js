const path = require("path");
const fs = require("fs/promises");

const sources = require("../sources/sources");

const filePath = path.join(__dirname, "../../data/codes.txt");

async function collectCodesFromSources() {
	const allCodes = new Map();

	for (const source of sources) {
		try {
			const codes = await source.getCodes();

			for (const [code, value] of codes.entries()) {
				allCodes.set(code, value);
			}
		} catch (error) {
			console.error(`[CODE SOURCE] Failed to fetch codes from ${source.name}:`, error);
		}
	}

	return allCodes;
}

async function loadSavedCodes() {
	try {
		const data = await fs.readFile(filePath, "utf-8");

		return new Set(
			data
				.split(/\r?\n/)
				.map((code) => code.trim())
				.filter(Boolean),
		);
	} catch (error) {
		if (error.code === "ENOENT") {
			return new Set();
		}

		console.error("[CODE TRACKER] Failed to load saved codes:", error);

		throw error;
	}
}

async function findNewCodes() {
	try {
		const allCodes = await collectCodesFromSources();
		const savedCodes = await loadSavedCodes();

		const newCodes = new Map();

		for (const [code, value] of allCodes.entries()) {
			if (!savedCodes.has(code)) {
				newCodes.set(code, value);
			}
		}

		return newCodes;
	} catch (error) {
		console.error("[CODE TRACKER] Failed to find new codes:", error);

		return new Map();
	}
}

async function saveNewCodes(codes) {
	try {
		if (codes === undefined || codes === null) {
			return;
		}

		let codeList;

		if (codes instanceof Map) {
			codeList = [...codes.keys()];
		} else if (Array.isArray(codes)) {
			codeList = codes;
		} else if (typeof codes === "object") {
			codeList = Object.keys(codes);
		} else {
			codeList = [codes];
		}

		const savedCodes = await loadSavedCodes();

		const codesToSave = codeList
			.map((code) => String(code).trim())
			.filter((code) => code && !savedCodes.has(code));

		if (codesToSave.length === 0) {
			return;
		}

		await fs.mkdir(path.dirname(filePath), {
			recursive: true,
		});

		await fs.appendFile(filePath, codesToSave.join("\n") + "\n", "utf-8");
	} catch (error) {
		console.error("[CODE TRACKER] Failed to save codes:", error);

		throw error;
	}
}

module.exports = {
	collectCodesFromSources,
	loadSavedCodes,
	findNewCodes,
	saveNewCodes,
};
