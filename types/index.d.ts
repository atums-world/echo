const LogLevelValue = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
	silent: 70,
} as const;

type LogLevelValue = typeof LogLevelValue[keyof typeof LogLevelValue];
type LogLevel = keyof typeof LogLevelValue;

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
};
