import {
	constants,
	type Stats,
	accessSync,
	existsSync,
	mkdirSync,
	statSync,
} from "node:fs";
import { resolve } from "node:path";
import { format, inspect } from "node:util";
import { getCallerInfo, getTimestamp, parsePattern } from "@lib/char";
import {
	ansiColors,
	defaultConfig,
	loadEnvConfig,
	loadLoggerConfig,
	logLevelValues,
} from "@lib/config";
import { FileLogger } from "@lib/file";
import type { LogLevel, LoggerConfig } from "@types";

class Echo {
	private readonly directory: string;
	private readonly config: Required<LoggerConfig>;
	private readonly fileLogger: FileLogger | null = null;

	constructor(config?: string | LoggerConfig) {
		const fileConfig: LoggerConfig =
			typeof config === "string"
				? loadLoggerConfig(config)
				: loadLoggerConfig();

		const overrideConfig: LoggerConfig =
			typeof config === "object" ? config : {};

		const envConfig: LoggerConfig = loadEnvConfig();

		this.config = {
			...defaultConfig,
			...fileConfig,
			...envConfig,
			...overrideConfig,
		};

		this.directory = resolve(this.config.directory);

		if (!this.config.disableFile) {
			Echo.validateDirectory(this.directory);

			this.fileLogger = new FileLogger(this.config);
		}
	}

	private static validateDirectory(dir: string): void {
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		const stat: Stats = statSync(dir);
		if (!stat.isDirectory()) {
			throw new Error(`[@atums/echo] ${dir} is not a directory`);
		}

		accessSync(dir, constants.W_OK);
	}

	private log(level: LogLevel, data: unknown): void {
		if (
			this.config.silent ||
			logLevelValues[this.config.level] > logLevelValues[level]
		)
			return;

		const meta = getCallerInfo(this.config);
		const line = parsePattern({ level, data, config: this.config });

		if (this.config.console) {
			console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
				line,
			);
		}

		if (!this.config.disableFile && this.fileLogger) {
			this.fileLogger.write(level, data, meta);
		}
	}

	public debug(data: unknown): void {
		this.log("debug", data);
	}

	public info(data: unknown): void {
		this.log("info", data);
	}

	public warn(data: unknown): void {
		this.log("warn", data);
	}

	public error(data: unknown): void {
		this.log("error", data);
	}

	public fatal(data: unknown): void {
		this.log("fatal", data);
	}

	public trace(data: unknown): void {
		this.log("trace", data);
	}

	public custom(tag: string, context: string, data: unknown): void {
		if (this.config.silent) return;

		const timestamps = getTimestamp(this.config);

		const normalizedTag = tag.toUpperCase();
		const tagColor = this.config.consoleColor
			? (ansiColors[this.config.customColors?.[normalizedTag] ?? "green"] ?? "")
			: "";
		const contextColor = this.config.consoleColor ? ansiColors.cyan : "";
		const gray = this.config.consoleColor ? ansiColors.gray : "";
		const reset = this.config.consoleColor ? ansiColors.reset : "";

		const resolvedData =
			this.config.prettyPrint && typeof data === "object" && data !== null
				? inspect(data, {
						depth: null,
						colors: this.config.consoleColor,
						breakLength: 1,
						compact: false,
					})
				: format(data);

		const pattern =
			this.config.customPattern ??
			"{color:gray}{pretty-timestamp}{reset} {color:tagColor}[{tag}]{reset} {color:contextColor}({context}){reset} {data}";

		const line = pattern
			.replace(/{timestamp}/g, timestamps.timestamp)
			.replace(/{pretty-timestamp}/g, timestamps.prettyTimestamp)
			.replace(/{tag}/g, tag)
			.replace(/{context}/g, context)
			.replace(/{data}/g, resolvedData)
			.replace(/{color:gray}/g, gray)
			.replace(/{color:tagColor}/g, tagColor)
			.replace(/{color:contextColor}/g, contextColor)
			.replace(/{reset}/g, reset);

		if (this.config.console) {
			console.log(line);
		}

		if (!this.config.disableFile && this.fileLogger) {
			const meta = getCallerInfo(this.config);
			this.fileLogger.write(tag, { context, data }, meta);
		}
	}

	public flush(): Promise<void> {
		return this.fileLogger?.flush() ?? Promise.resolve();
	}
}

function createLogger(config?: string | LoggerConfig): Echo {
	return new Echo(config);
}

const echo = new Echo();
export { echo, Echo, createLogger };
export type { LoggerConfig, LogLevel } from "@types";
