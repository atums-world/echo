import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { LogLevel, LoggerConfig } from "@types";

const logLevelValues = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
	silent: 70,
} as const;

const defaultLevelColor: Record<LogLevel, keyof typeof ansiColors> = {
	trace: "cyan",
	debug: "blue",
	info: "green",
	warn: "yellow",
	error: "red",
	fatal: "red",
	silent: "gray",
};

const ansiColors: Record<string, string> = {
	reset: "\x1b[0m",
	dim: "\x1b[2m",
	bright: "\x1b[1m",
	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	gray: "\x1b[90m",
	bold: "\x1b[1m",
	underline: "\x1b[4m",
	inverse: "\x1b[7m",
	hidden: "\x1b[8m",
	strikethrough: "\x1b[9m",
} as const;

const defaultConfig: Required<LoggerConfig> = {
	directory: "logs",
	level: "info",
	disableFile: false,

	rotate: true,
	maxFiles: null,
	fileNameFormat: "yyyy-MM-dd",

	console: true,
	consoleColor: true,

	dateFormat: "yyyy-MM-dd HH:mm:ss.SSS",
	timezone: "local",

	silent: false,

	pattern:
		"{color:gray}{pretty-timestamp}{reset} {color:levelColor}[{level-name}]{reset} {color:gray}({reset}{file-name}:{line}:{column}{color:gray}){reset} {data}",

	levelColor: {
		trace: "cyan",
		debug: "blue",
		info: "green",
		warn: "yellow",
		error: "red",
		fatal: "red",
	},

	customColors: {},
	customPattern:
		"{color:gray}{pretty-timestamp}{reset} {color:tagColor}[{tag}]{reset} {color:contextColor}({context}){reset} {data}",

	prettyPrint: true,
};

function isValidLogLevel(level: string): level is LogLevel {
	return level in logLevelValues;
}

function isValidColor(color: string): color is keyof typeof ansiColors {
	return color in ansiColors;
}

function parseNumericEnv(
	value: string | undefined,
	min = 0,
): number | undefined {
	if (!value) return undefined;

	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed) || parsed < min) {
		return undefined;
	}

	return parsed;
}

function parseBooleanEnv(value: string | undefined): boolean | undefined {
	if (!value) return undefined;
	return value.toLowerCase() === "true";
}

function validateAndSanitizeConfig(
	config: LoggerConfig,
	source: string,
): LoggerConfig {
	const sanitized = { ...config };
	const warnings: string[] = [];

	if (sanitized.level && !isValidLogLevel(sanitized.level)) {
		warnings.push(
			`Invalid log level "${sanitized.level}" in ${source}, using default "info"`,
		);
		sanitized.level = "info";
	}

	if (sanitized.maxFiles !== undefined && sanitized.maxFiles !== null) {
		if (
			typeof sanitized.maxFiles !== "number" ||
			sanitized.maxFiles < 1 ||
			!Number.isInteger(sanitized.maxFiles)
		) {
			warnings.push(
				`Invalid maxFiles value "${sanitized.maxFiles}" in ${source}, setting to null`,
			);
			sanitized.maxFiles = null;
		}
	}

	if (sanitized.levelColor) {
		const validLevelColors: Partial<Record<LogLevel, keyof typeof ansiColors>> =
			{};

		for (const [level, color] of Object.entries(sanitized.levelColor)) {
			if (!isValidLogLevel(level)) {
				warnings.push(
					`Invalid log level "${level}" in levelColor from ${source}, skipping`,
				);
				continue;
			}
			if (!isValidColor(color)) {
				warnings.push(
					`Invalid color "${color}" for level "${level}" in ${source}, using default`,
				);
				validLevelColors[level as LogLevel] =
					defaultLevelColor[level as LogLevel];
			} else {
				validLevelColors[level as LogLevel] = color;
			}
		}

		sanitized.levelColor = validLevelColors;
	}

	if (sanitized.customColors) {
		const validCustomColors: Record<string, keyof typeof ansiColors> = {};

		for (const [tag, color] of Object.entries(sanitized.customColors)) {
			if (!isValidColor(color)) {
				warnings.push(
					`Invalid color "${color}" for tag "${tag}" in ${source}, skipping`,
				);
				continue;
			}
			validCustomColors[tag] = color;
		}

		sanitized.customColors = validCustomColors;
	}

	if (warnings.length > 0) {
		console.warn(
			`[@atums/echo] Configuration warnings:\n  ${warnings.join("\n  ")}`,
		);
	}

	return sanitized;
}

function loadLoggerConfig(configPath = "logger.json"): LoggerConfig {
	try {
		const fullPath: string = resolve(process.cwd(), configPath);
		const raw: string = readFileSync(fullPath, "utf-8");
		const parsed = JSON.parse(raw);

		if (typeof parsed !== "object" || parsed === null) {
			console.warn(`[@atums/echo] Invalid config file format: ${configPath}`);
			return {};
		}

		return validateAndSanitizeConfig(parsed, `config file "${configPath}"`);
	} catch (error) {
		if (error instanceof Error && !error.message.includes("ENOENT")) {
			console.warn(
				`[@atums/echo] Failed to load config file ${configPath}:`,
				error.message,
			);
		}
		return {};
	}
}

function loadEnvConfig(): LoggerConfig {
	const config: LoggerConfig = {};

	if (process.env.LOG_LEVEL && isValidLogLevel(process.env.LOG_LEVEL)) {
		config.level = process.env.LOG_LEVEL;
	}

	if (process.env.LOG_DIRECTORY) {
		config.directory = process.env.LOG_DIRECTORY;
	}

	config.disableFile = parseBooleanEnv(process.env.LOG_DISABLE_FILE);
	config.rotate = parseBooleanEnv(process.env.LOG_ROTATE);
	config.console = parseBooleanEnv(process.env.LOG_CONSOLE);
	config.consoleColor = parseBooleanEnv(process.env.LOG_CONSOLE_COLOR);
	config.silent = parseBooleanEnv(process.env.LOG_SILENT);
	config.prettyPrint = parseBooleanEnv(process.env.LOG_PRETTY_PRINT);

	const maxFiles = parseNumericEnv(process.env.LOG_MAX_FILES, 1);
	if (maxFiles !== undefined) {
		config.maxFiles = maxFiles;
	}

	if (process.env.LOG_FILE_NAME_FORMAT) {
		config.fileNameFormat = process.env.LOG_FILE_NAME_FORMAT;
	}

	if (process.env.LOG_DATE_FORMAT) {
		config.dateFormat = process.env.LOG_DATE_FORMAT;
	}

	if (process.env.LOG_TIMEZONE) {
		config.timezone = process.env.LOG_TIMEZONE;
	}

	if (process.env.LOG_PATTERN) {
		config.pattern = process.env.LOG_PATTERN;
	}

	if (process.env.LOG_CUSTOM_PATTERN) {
		config.customPattern = process.env.LOG_CUSTOM_PATTERN;
	}

	if (process.env.LOG_LEVEL_COLOR) {
		const colors = process.env.LOG_LEVEL_COLOR.split(",");
		const levelColor: Partial<Record<LogLevel, keyof typeof ansiColors>> = {};

		for (const colorPair of colors) {
			const [level, colorName] = colorPair.split(":");

			if (
				level &&
				colorName &&
				isValidLogLevel(level) &&
				isValidColor(colorName)
			) {
				levelColor[level] = colorName;
			} else {
				console.warn(`[@atums/echo] Invalid level color pair: ${colorPair}`);
			}
		}

		if (Object.keys(levelColor).length > 0) {
			config.levelColor = levelColor;
		}
	}

	if (process.env.LOG_CUSTOM_COLORS) {
		const colors = process.env.LOG_CUSTOM_COLORS.split(",");
		const customColors: Record<string, keyof typeof ansiColors> = {};

		for (const colorPair of colors) {
			const [tag, colorName] = colorPair.split(":");

			if (tag && colorName && isValidColor(colorName)) {
				customColors[tag] = colorName;
			} else {
				console.warn(`[@atums/echo] Invalid custom color pair: ${colorPair}`);
			}
		}

		if (Object.keys(customColors).length > 0) {
			config.customColors = customColors;
		}
	}

	const sanitizedConfig = validateAndSanitizeConfig(
		config,
		"environment variables",
	);

	return Object.fromEntries(
		Object.entries(sanitizedConfig).filter(([_, value]) => value !== undefined),
	) as LoggerConfig;
}

export {
	defaultConfig,
	defaultLevelColor,
	loadLoggerConfig,
	loadEnvConfig,
	logLevelValues,
	ansiColors,
	validateAndSanitizeConfig,
	isValidLogLevel,
	isValidColor,
};
