import path from "node:path";
import {readFile, appendFile, mkdir} from "node:fs/promises";
import sources from "../sources/sources";
import type {Code} from "./Code";

const filePath = path.join(__dirname, "../../data/codes.txt");

export async function collectCodesFromSources(): Promise<Code[]> {
	const allCodes = [];
	for (const source of sources) {
		try {
			allCodes.push(...(await source.getCodes()));
		} catch (error) {
			console.error(`[CODE SOURCE] Failed to fetch codes from ${source.name}:`, error);
		}
	}
	return allCodes;
}

export async function loadSavedCodes(): Promise<Set<string>> {
	try {
		const data = await readFile(filePath, "utf-8");
		return new Set(
			data
				.split(/\r?\n/)
				.map((code) => code.trim())
				.filter(Boolean),
		);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Set();
		console.error("[CODE TRACKER] Failed to load saved codes:", error);
		throw error;
	}
}

export async function findNewCodes(): Promise<Code[]> {
	try {
		const allCodes = await collectCodesFromSources();
		const savedCodes = await loadSavedCodes();
		const seenCodes = new Set(savedCodes);
		return allCodes.filter((code) => {
			const value = code.getCode();
			if (seenCodes.has(value) || /[^a-zA-Z0-9]/.test(value)) return false;
			seenCodes.add(value);
			return true;
		});
	} catch (error) {
		console.error("[CODE TRACKER] Failed to find new codes:", error);
		return [];
	}
}

export async function saveNewCodes(codes: Code[]): Promise<void> {
	try {
		const savedCodes = await loadSavedCodes();
		const codesToSave = codes
			.map((code) => code.getCode())
			.filter((code) => code && !savedCodes.has(code));
		if (codesToSave.length === 0) return;
		await mkdir(path.dirname(filePath), {recursive: true});
		await appendFile(filePath, `${codesToSave.join("\n")}\n`, "utf-8");
	} catch (error) {
		console.error("[CODE TRACKER] Failed to save codes:", error);
		throw error;
	}
}
