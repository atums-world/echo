import { ansiColors, logLevelValues } from "@lib/config";

type LogLevelValue = typeof logLevelValues[keyof typeof logLevelValues];
type LogLevel = keyof typeof logLevelValues;

type LoggerConfig = {
	directory?: string;
	level?: LogLevel;
	disableFile?: boolean;

	rotate?: boolean;
	maxSizeMB?: number;
	maxFiles?: number;

	console?: boolean;
	consoleColor?: boolean;

	dateFormat?: string;
	timezone?: string;

	silent?: boolean;

	pattern?: string;
	levelColor?: Partial<Record<LogLevel, keyof typeof ansiColors>>;
};

interface PatternContext {
	level: LogLevel;
	data: unknown;
	config: Required<LoggerConfig>;
}

export type { LogLevel, LogLevelValue, LoggerConfig, PatternContext };
