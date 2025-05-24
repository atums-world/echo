import {
	type WriteStream,
	createWriteStream,
	existsSync,
	mkdirSync,
} from "node:fs";
import { join } from "node:path";
import type { LogLevel, LoggerConfig } from "@types";
import { format } from "date-fns-tz";

let currentStream: WriteStream | null = null;
let currentFilePath = "";
let currentDate = "";

function getLogFilePath(
	config: Required<LoggerConfig>,
	dateStr: string,
): string {
	return join(config.directory, `${dateStr}.jsonl`);
}

function resetStream(path: string): void {
	currentStream?.end();
	currentStream = createWriteStream(path, { flags: "a", encoding: "utf-8" });
	currentFilePath = path;
}

export function writeLogJson(
	level: LogLevel,
	data: unknown,
	meta: {
		id: string;
		fileName: string;
		line: string;
		column: string;
		timestamp: string;
		prettyTimestamp: string;
	},
	config: Required<LoggerConfig>,
): void {
	if (config.disableFile) return;

	const now = new Date();

	if (!existsSync(config.directory)) {
		mkdirSync(config.directory, { recursive: true });
	}

	let filePath: string;

	if (config.rotate) {
		const dateStr = format(now, "yyyy-MM-dd", {
			timeZone: config.timezone,
		});
		filePath = getLogFilePath(config, dateStr);

		if (
			currentStream === null ||
			currentFilePath !== filePath ||
			currentDate !== dateStr
		) {
			currentDate = dateStr;
			resetStream(filePath);
		}
	} else {
		filePath = join(config.directory, "log.jsonl");

		if (currentStream === null || currentFilePath !== filePath) {
			resetStream(filePath);
		}
	}

	const line = `${JSON.stringify({
		timestamp: new Date(meta.timestamp).getTime(),
		level,
		id: meta.id,
		file: meta.fileName,
		line: meta.line,
		column: meta.column,
		data:
			data instanceof Error
				? {
						name: data.name,
						message: data.message,
						stack: data.stack,
					}
				: typeof data === "string" || typeof data === "number"
					? data
					: data,
	})}\n`;

	if (currentStream === null) {
		throw new Error("Logger stream is not initialized");
	}

	currentStream.write(line);
}

process.on("exit", () => {
	currentStream?.end();
});
process.on("SIGINT", () => {
	currentStream?.end();
	process.exit();
});
