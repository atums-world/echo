import { ansiColors, logLevelValues } from "@lib/config";

type LogLevelValue = typeof logLevelValues[keyof typeof logLevelValues];
type LogLevel = keyof typeof logLevelValues;

type LoggerConfig = {
	directory?: string;
	level?: LogLevel;
	disableFile?: boolean;

	rotate?: boolean;
	maxFiles?: number;

	console?: boolean;
	consoleColor?: boolean;

	dateFormat?: string;
	timezone?: string;

	silent?: boolean;

	pattern?: string;
	levelColor?: Partial<Record<LogLevel, keyof typeof ansiColors>>;

	customPattern?: string;
	customColors?: Record<string, keyof typeof ansiColors>;

	prettyPrint?: boolean;
};

interface PatternContext {
	level: LogLevel;
	data: unknown;
	config: Required<LoggerConfig>;
}

export type { LogLevel, LogLevelValue, LoggerConfig, PatternContext };
