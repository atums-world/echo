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
};

const defaultConfig: Required<LoggerConfig> = {
	directory: "logs",
	level: "info",
	disableFile: false,

	rotate: true,
	maxSizeMB: 5,
	maxFiles: 3,

	console: true,
	consoleColor: true,

	dateFormat: "yyyy-MM-dd HH:mm:ss.SSS",
	timezone: "local",

	silent: false,

	pattern:
		"{color:gray}{timestamp}{reset} {color:levelColor}[{level-name}]{reset} {color:gray}({reset}{file-name}:{line}:{column}{color:gray}){reset} {data}",

	levelColor: {
		trace: "cyan",
		debug: "blue",
		info: "green",
		warn: "yellow",
		error: "red",
		fatal: "red",
	},
};

function loadLoggerConfig(configPath = "logger.json"): LoggerConfig {
	try {
		const fullPath: string = resolve(process.cwd(), configPath);
		const raw: string = readFileSync(fullPath, "utf-8");
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

function loadEnvConfig(): LoggerConfig {
	const config: LoggerConfig = {};

	if (process.env.LOG_LEVEL) config.level = process.env.LOG_LEVEL as LogLevel;
	if (process.env.LOG_DIRECTORY) config.directory = process.env.LOG_DIRECTORY;
	if (process.env.LOG_DISABLE_FILE)
		config.disableFile = process.env.LOG_DISABLE_FILE === "true";
	if (process.env.LOG_ROTATE) config.rotate = process.env.LOG_ROTATE === "true";
	if (process.env.LOG_MAX_SIZE_MB)
		config.maxSizeMB = Number.parseInt(process.env.LOG_MAX_SIZE_MB, 10);
	if (process.env.LOG_MAX_FILES)
		config.maxFiles = Number.parseInt(process.env.LOG_MAX_FILES, 10);
	if (process.env.LOG_CONSOLE)
		config.console = process.env.LOG_CONSOLE === "true";
	if (process.env.LOG_CONSOLE_COLOR)
		config.consoleColor = process.env.LOG_CONSOLE_COLOR === "true";
	if (process.env.LOG_DATE_FORMAT)
		config.dateFormat = process.env.LOG_DATE_FORMAT;
	if (process.env.LOG_TIMEZONE) config.timezone = process.env.LOG_TIMEZONE;
	if (process.env.LOG_SILENT) config.silent = process.env.LOG_SILENT === "true";
	if (process.env.LOG_PATTERN) config.pattern = process.env.LOG_PATTERN;

	return config;
}

export {
	defaultConfig,
	loadLoggerConfig,
	loadEnvConfig,
	logLevelValues,
	ansiColors,
};
