import {
	constants,
	type Stats,
	accessSync,
	existsSync,
	mkdirSync,
	statSync,
} from "node:fs";
import { resolve } from "node:path";
import { getCallerInfo, parsePattern } from "@lib/char";
import {
	defaultConfig,
	loadEnvConfig,
	loadLoggerConfig,
	logLevelValues,
} from "@lib/config";
import { writeLogJson } from "@lib/file";
import type { LogLevel, LoggerConfig } from "@types";

class Echo {
	private readonly directory: string;
	private readonly config: Required<LoggerConfig>;

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

	public getDirectory(): string {
		return this.directory;
	}

	public getConfig(): Required<LoggerConfig> {
		return this.config;
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

		if (!this.config.disableFile) {
			writeLogJson(level, data, meta, this.config);
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
}

const echo = new Echo();
export { echo, Echo };
