import type { ansiColors, logLevelValues } from "@lib/config";

type LogLevelValue = (typeof logLevelValues)[keyof typeof logLevelValues];
type LogLevel = keyof typeof logLevelValues;

type LoggerConfig = {
	directory?: string;
	level?: LogLevel;
	disableFile?: boolean;

	rotate?: boolean;
	maxFiles?: number | null;
	fileNameFormat?: string;

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

type PatternContext = {
	level: LogLevel;
	data: unknown;
	config: Required<LoggerConfig>;
};

interface PatternTokens {
	timestamp?: string;
	prettyTimestamp?: string;
	levelName?: string;
	level?: string;
	fileName?: string;
	line?: string;
	column?: string;
	data?: string;
	id?: string;
	tag?: string;
	context?: string;
}

export type {
	LogLevel,
	LogLevelValue,
	LoggerConfig,
	PatternContext,
	PatternTokens,
};
