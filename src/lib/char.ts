import { basename } from "node:path";
import { format, inspect } from "node:util";
import { format as formatDate } from "date-fns-tz";

import { ansiColors, defaultLevelColor, logLevelValues } from "@lib/config";
import type {
	LogLevel,
	LogLevelValue,
	LoggerConfig,
	PatternContext,
} from "@types";

function getTimestamp(config: Required<LoggerConfig>): {
	prettyTimestamp: string;
	timestamp: string;
} {
	const now = new Date();

	if (config.timezone === "local") {
		return {
			prettyTimestamp: formatDate(now, config.dateFormat),
			timestamp: now.toISOString(),
		};
	}

	return {
		prettyTimestamp: formatDate(now, config.dateFormat, {
			timeZone: config.timezone,
		}),
		timestamp: now.toISOString(),
	};
}

function getCallerInfo(config: Required<LoggerConfig>): {
	id: string;
	fileName: string;
	line: string;
	column: string;
	timestamp: string;
	prettyTimestamp: string;
} {
	const id = generateShortId();

	const timestampInfo = getTimestamp(config);
	const fallback = {
		id,
		fileName: "unknown",
		line: "0",
		column: "0",
		timestamp: timestampInfo.timestamp,
		prettyTimestamp: timestampInfo.prettyTimestamp,
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
				id: id,
				fileName: basename(fullPath),
				line: lineNumber,
				column: columnNumber,
				timestamp: timestampInfo.timestamp,
				prettyTimestamp: timestampInfo.prettyTimestamp,
			};
		}

		const rawMatch = line.match(/at\s+(?:.*\()?(.+):(\d+):(\d+)\)?/);
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
				id: id,
				fileName: basename(fullPath),
				line: lineNumber,
				column: columnNumber,
				timestamp: timestampInfo.timestamp,
				prettyTimestamp: timestampInfo.prettyTimestamp,
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
			if (!config.consoleColor) return "";
			if (colorKey === "levelColor") {
				const colorForLevel =
					config.levelColor?.[level] ?? defaultLevelColor[level];
				return ansiColors[colorForLevel ?? ""] ?? "";
			}
			return ansiColors[colorKey] ?? "";
		})
		.replace(/{reset}/g, config.consoleColor ? ansiColors.reset : "");
}

function parsePattern(ctx: PatternContext): string {
	const { level, data, config } = ctx;

	const { id, fileName, line, column, timestamp, prettyTimestamp } =
		getCallerInfo(config);
	const resolvedData: string =
		config.prettyPrint && typeof data === "object" && data !== null
			? inspect(data, {
					depth: null,
					colors: config.consoleColor,
					breakLength: 1,
					compact: false,
				})
			: format(data);

	const numericLevel: LogLevelValue = logLevelValues[level];

	const final = config.pattern
		.replace(/{timestamp}/g, timestamp)
		.replace(/{pretty-timestamp}/g, prettyTimestamp)
		.replace(/{level-name}/g, level.toUpperCase())
		.replace(/{level}/g, String(numericLevel))
		.replace(/{file-name}/g, fileName)
		.replace(/{line}/g, line)
		.replace(/{data}/g, resolvedData)
		.replace(/{id}/g, id)
		.replace(/{column}/g, column);

	return replaceColorTokens(final, level, config);
}

export { parsePattern, getCallerInfo, getTimestamp, generateShortId };
