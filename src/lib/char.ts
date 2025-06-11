import { basename } from "node:path";
import { format, inspect } from "node:util";
import { format as formatDate } from "date-fns-tz";

import { ansiColors, defaultLevelColor, logLevelValues } from "@lib/config";
import type {
	LogLevel,
	LogLevelValue,
	LoggerConfig,
	PatternContext,
	PatternTokens,
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
	if (!stack) return fallback;

	const lines = stack.split("\n");

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();

		const fileURLMatch = line.match(
			/at\s+(?:.*\()?file:\/\/(.*):(\d+):(\d+)\)?/,
		);
		if (fileURLMatch) {
			const [_, fullPath, lineNumber, columnNumber] = fileURLMatch;
			const isInternal =
				fullPath.includes("atums.echo") || fullPath.includes("@atums/echo");

			if (isInternal) continue;

			return {
				id,
				fileName: basename(fullPath),
				line: lineNumber,
				column: columnNumber,
				timestamp: timestampInfo.timestamp,
				prettyTimestamp: timestampInfo.prettyTimestamp,
			};
		}

		const rawMatch = line.match(/at\s+(?:.*\()?(.+):(\d+):(\d+)\)?/);
		if (rawMatch) {
			const [_, fullPath, lineNumber, columnNumber] = rawMatch;
			const isInternal =
				fullPath.includes("atums.echo") || fullPath.includes("@atums/echo");

			if (isInternal) continue;

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

function formatData(data: unknown, config: Required<LoggerConfig>): string {
	return config.prettyPrint && typeof data === "object" && data !== null
		? inspect(data, {
				depth: null,
				colors: config.consoleColor,
				breakLength: 1,
				compact: false,
			})
		: format(data);
}

function getConsoleMethod(level: LogLevel): "log" | "warn" | "error" {
	if (level === "error" || level === "fatal") return "error";
	if (level === "warn") return "warn";
	return "log";
}

function resolveColor(
	colorKey: string,
	config: Required<LoggerConfig>,
	level?: LogLevel,
	tag?: string,
): string {
	if (!config.consoleColor) return "";

	if (colorKey === "levelColor" && level) {
		const colorForLevel =
			config.levelColor?.[level] ?? defaultLevelColor[level];
		return ansiColors[colorForLevel ?? ""] ?? "";
	}

	if (colorKey === "tagColor" && tag) {
		const normalizedTag = tag.toUpperCase();
		return ansiColors[config.customColors?.[normalizedTag] ?? "green"] ?? "";
	}

	if (colorKey === "contextColor") {
		return ansiColors.cyan ?? "";
	}

	return ansiColors[colorKey] ?? "";
}

function serializeLogData(data: unknown): unknown {
	if (data instanceof Error) {
		return {
			name: data.name,
			message: data.message,
			stack: data.stack,
		};
	}

	if (typeof data === "string" || typeof data === "number") {
		return data;
	}

	return data;
}

function processPattern(
	pattern: string,
	tokens: PatternTokens,
	config: Required<LoggerConfig>,
	level?: LogLevel,
	tag?: string,
): string {
	let processed = pattern;

	if (tokens.timestamp) {
		processed = processed.replace(/{timestamp}/g, tokens.timestamp);
	}
	if (tokens.prettyTimestamp) {
		processed = processed.replace(
			/{pretty-timestamp}/g,
			tokens.prettyTimestamp,
		);
	}
	if (tokens.levelName) {
		processed = processed.replace(/{level-name}/g, tokens.levelName);
	}
	if (tokens.level) {
		processed = processed.replace(/{level}/g, tokens.level);
	}
	if (tokens.fileName) {
		processed = processed.replace(/{file-name}/g, tokens.fileName);
	}
	if (tokens.line) {
		processed = processed.replace(/{line}/g, tokens.line);
	}
	if (tokens.column) {
		processed = processed.replace(/{column}/g, tokens.column);
	}
	if (tokens.data) {
		processed = processed.replace(/{data}/g, tokens.data);
	}
	if (tokens.id) {
		processed = processed.replace(/{id}/g, tokens.id);
	}
	if (tokens.tag) {
		processed = processed.replace(/{tag}/g, tokens.tag);
	}
	if (tokens.context) {
		processed = processed.replace(/{context}/g, tokens.context);
	}

	processed = processed.replace(/{color:(\w+)}/g, (_, colorKey) => {
		return resolveColor(colorKey, config, level, tag);
	});

	processed = processed.replace(
		/{reset}/g,
		config.consoleColor ? ansiColors.reset : "",
	);

	return processed;
}

function parsePattern(ctx: PatternContext): string {
	const { level, data, config } = ctx;

	const { id, fileName, line, column, timestamp, prettyTimestamp } =
		getCallerInfo(config);

	const resolvedData: string = formatData(data, config);
	const numericLevel: LogLevelValue = logLevelValues[level];

	const tokens: PatternTokens = {
		timestamp,
		prettyTimestamp,
		levelName: level.toUpperCase(),
		level: String(numericLevel),
		fileName,
		line,
		column,
		data: resolvedData,
		id,
	};

	return processPattern(config.pattern, tokens, config, level);
}

export {
	parsePattern,
	getCallerInfo,
	getTimestamp,
	generateShortId,
	formatData,
	getConsoleMethod,
	resolveColor,
	serializeLogData,
	processPattern,
};
