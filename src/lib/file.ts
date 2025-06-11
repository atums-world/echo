import {
	type WriteStream,
	createWriteStream,
	existsSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { serializeLogData } from "@lib/char";
import { format } from "date-fns-tz";

import type { LogLevel, LoggerConfig } from "@types";

class FileLogger {
	private stream: WriteStream | null = null;
	private filePath = "";
	private date = "";
	private fileNameFormat = "yyyy-MM-dd";

	constructor(private readonly config: Required<LoggerConfig>) {
		if (!existsSync(this.config.directory)) {
			mkdirSync(this.config.directory, { recursive: true });
		}

		if (this.config.fileNameFormat) {
			try {
				format(new Date(), this.config.fileNameFormat, {
					timeZone: this.config.timezone,
				});
				this.fileNameFormat = this.config.fileNameFormat;
			} catch (error) {
				throw new Error(
					`[@atums/echo] Invalid fileNameFormat: ${this.config.fileNameFormat}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}
	}

	private getLogFilePath(dateStr: string): string {
		const fileName = `${dateStr}.jsonl`;
		return join(this.config.directory, fileName);
	}

	private resetStream(path: string): void {
		this.stream?.end();
		this.stream = createWriteStream(path, { flags: "a", encoding: "utf-8" });
		this.filePath = path;
	}

	private generateFileRegex(): RegExp {
		const pattern = this.fileNameFormat
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
			.replace(/\\y\\y\\y\\y/g, "\\d{4}")
			.replace(/\\M\\M/g, "\\d{2}")
			.replace(/\\d\\d/g, "\\d{2}")
			.replace(/\\H\\H/g, "\\d{2}")
			.replace(/\\m\\m/g, "\\d{2}")
			.replace(/\\s\\s/g, "\\d{2}")
			.replace(/\\S\\S\\S/g, "\\d{3}");

		return new RegExp(`^${pattern}\\.jsonl$`);
	}

	private pruneOldLogs(): void {
		if (this.config.maxFiles === null) {
			return;
		}

		if (this.config.maxFiles < 1) {
			throw new Error("[@atums/echo] maxFiles must be >= 1 if set.");
		}

		const fileRegex = this.generateFileRegex();
		const files = readdirSync(this.config.directory)
			.filter((file) => fileRegex.test(file))
			.sort();

		const excess = files.slice(
			0,
			Math.max(0, files.length - this.config.maxFiles),
		);

		for (const file of excess) {
			try {
				unlinkSync(join(this.config.directory, file));
			} catch {}
		}
	}

	private getFilePath(dateStr?: string): string {
		if (this.config.rotate && dateStr) {
			return this.getLogFilePath(dateStr);
		}
		return join(this.config.directory, "log.jsonl");
	}

	public write(
		level: LogLevel | string,
		data: unknown,
		meta: {
			id: string;
			fileName: string;
			line: string;
			column: string;
			timestamp: string;
			prettyTimestamp: string;
		},
	): void {
		if (this.config.disableFile) return;

		const now = new Date();
		const line = `${JSON.stringify({
			timestamp: new Date(meta.timestamp).getTime(),
			level,
			id: meta.id,
			file: meta.fileName,
			line: meta.line,
			column: meta.column,
			data: serializeLogData(data),
		})}\n`;

		let path: string;
		const dateStr = this.config.rotate
			? format(now, this.fileNameFormat, { timeZone: this.config.timezone })
			: undefined;

		const needsRotation = this.config.rotate && this.date !== dateStr;
		path = this.getFilePath(dateStr);

		if (!this.stream || needsRotation || this.filePath !== path) {
			if (this.config.rotate && dateStr) {
				this.date = dateStr;
			}
			this.resetStream(path);

			if (needsRotation) {
				this.pruneOldLogs();
			}
		}

		try {
			this.stream?.write(line);
		} catch (err) {
			if (this.config.console) {
				throw new Error(`[@atums/echo] Failed to write to log file: ${err}`);
			}
		}
	}

	public flush(): Promise<void> {
		return new Promise((resolve) => {
			this.stream?.end(resolve);
		});
	}
}

export { FileLogger };
