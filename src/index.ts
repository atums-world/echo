import {
	constants,
	type Stats,
	accessSync,
	existsSync,
	mkdirSync,
	statSync,
} from "node:fs";
import { resolve } from "node:path";
import {
	formatData,
	getCallerInfo,
	getConsoleMethod,
	getTimestamp,
	parsePattern,
	processPattern,
} from "#lib/char";
import {
	defaultConfig,
	loadEnvConfig,
	loadLoggerConfig,
	logLevelValues,
	validateAndSanitizeConfig,
} from "#lib/config";
import { FileLogger } from "#lib/file";

import type { LogLevel, LoggerConfig, PatternTokens } from "#types";

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

		const mergedConfig = {
			...defaultConfig,
			...fileConfig,
			...envConfig,
			...overrideConfig,
		};
		const finalConfig = validateAndSanitizeConfig(
			mergedConfig,
			"merged configuration",
		);

		this.config = finalConfig as Required<LoggerConfig>;

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

	private log(level: LogLevel, ...args: unknown[]): void {
		if (
			this.config.silent ||
			logLevelValues[this.config.level] > logLevelValues[level]
		)
			return;

		const meta = getCallerInfo(this.config);
		const line = parsePattern({ level, data: args, config: this.config });

		if (this.config.console) {
			console[getConsoleMethod(level)](line);
		}
		if (!this.config.disableFile && this.fileLogger) {
			this.fileLogger.write(level, args, meta);
		}
	}

	public debug(...args: unknown[]): void {
		this.log("debug", ...args);
	}

	public info(...args: unknown[]): void {
		this.log("info", ...args);
	}

	public warn(...args: unknown[]): void {
		this.log("warn", ...args);
	}

	public error(...args: unknown[]): void {
		this.log("error", ...args);
	}

	public fatal(...args: unknown[]): void {
		this.log("fatal", ...args);
	}

	public trace(...args: unknown[]): void {
		this.log("trace", ...args);
	}

	public custom(tag: string, context: string, data: unknown): void {
		if (this.config.silent) return;

		const timestamps = getTimestamp(this.config);
		const resolvedData = formatData(data, this.config);

		const pattern =
			this.config.customPattern ??
			"{color:gray}{pretty-timestamp}{reset} {color:tagColor}[{tag}]{reset} {color:contextColor}({context}){reset} {data}";

		const tokens: PatternTokens = {
			timestamp: timestamps.timestamp,
			prettyTimestamp: timestamps.prettyTimestamp,
			tag,
			context,
			data: resolvedData,
		};

		const line = processPattern(pattern, tokens, this.config, undefined, tag);

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
