import {
	constants,
	type Stats,
	accessSync,
	existsSync,
	mkdirSync,
	statSync,
} from "node:fs";
import { resolve } from "node:path";
import { defaultConfig, loadEnvConfig, loadLoggerConfig } from "@lib/config";

export class Echo {
	private readonly directory: string;
	private readonly config: Required<LoggerConfig>;

	constructor(configOrPath?: string | LoggerConfig) {
		const fileConfig: LoggerConfig =
			typeof configOrPath === "string"
				? loadLoggerConfig(configOrPath)
				: loadLoggerConfig();

		const overrideConfig: LoggerConfig =
			typeof configOrPath === "object" ? configOrPath : {};

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
}
