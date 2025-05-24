import { basename } from "node:path";
import { format } from "node:util";
import { format as formatDate } from "date-fns-tz";

import { ansiColors, logLevelValues } from "@lib/config";
import type {
	LogLevel,
	LogLevelValue,
	LoggerConfig,
	PatternContext,
} from "@types";

function getTimestamp(config: Required<LoggerConfig>): string {
	const now = new Date();

	if (config.timezone === "local") {
		return formatDate(now, config.dateFormat);
	}

	return formatDate(now, config.dateFormat, {
		timeZone: config.timezone,
	});
}

function getCallerInfo(config: Required<LoggerConfig>): {
	fileName: string;
	line: string;
	column: string;
	timestamp: string;
} {
	const fallback = {
		fileName: "unknown",
		line: "0",
		timestamp: getTimestamp(config),
		column: "0",
	};

	const stack = new Error().stack;
	if (!stack) {
		return fallback;
	}

	const lines = stack.split("\n");

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();

		const fileURLMatch = line.match(
			/at\s+(?:.*\()?file:\/\/(.*):(\d+):(\d+)\)?/,
		);
		if (fileURLMatch) {
			const fullPath = fileURLMatch[1];
			const lineNumber = fileURLMatch[2];
			const columnNumber = fileURLMatch[3];

			return {
				fileName: basename(fullPath),
				line: lineNumber,
				column: columnNumber,
				timestamp: getTimestamp(config),
			};
		}

		const rawMatch = line.match(/at\s+(\/.*):(\d+):(\d+)/);
		if (rawMatch) {
			const fullPath = rawMatch[1];
			const lineNumber = rawMatch[2];
			const columnNumber = rawMatch[3];

			if (
				fullPath.includes("/logger/") ||
				fullPath.includes("/src/index.ts") ||
				fullPath.includes("/src/lib/")
			) {
				continue;
			}

			return {
				fileName: basename(fullPath),
				line: lineNumber,
				column: columnNumber,
				timestamp: getTimestamp(config),
			};
		}
	}

	return fallback;
}

function generateShortId(length = 8): string {
	const chars =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	let id = "";

	for (let i = 0; i < length; i++) {
		const rand = Math.floor(Math.random() * chars.length);
		id += chars[rand];
	}

	return id;
}

function replaceColorTokens(
	input: string,
	level: LogLevel,
	config: Required<LoggerConfig>,
): string {
	return input
		.replace(/{color:(\w+)}/g, (_, colorKey) => {
			if (colorKey === "levelColor") {
				const colorForLevel = config.levelColor?.[level];
				return ansiColors[colorForLevel ?? ""] ?? "";
			}
			return ansiColors[colorKey] ?? "";
		})
		.replace(/{reset}/g, ansiColors.reset);
}

function parsePattern(ctx: PatternContext): string {
	const { level, data, config } = ctx;

	const { fileName, line, column, timestamp } = getCallerInfo(config);
	const resolvedData: string = format(data);
	const numericLevel: LogLevelValue = logLevelValues[level];

	const final: string = config.pattern
		.replace(/{timestamp}/g, timestamp)
		.replace(/{level-name}/g, level.toUpperCase())
		.replace(/{level}/g, String(numericLevel))
		.replace(/{file-name}/g, fileName)
		.replace(/{line}/g, line)
		.replace(/{data}/g, resolvedData)
		.replace(/{id}/g, generateShortId())
		.replace(/{column}/g, column);

	return config.consoleColor ? replaceColorTokens(final, level, config) : final;
}

export { parsePattern };
