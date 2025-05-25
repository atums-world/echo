import {
	type WriteStream,
	createWriteStream,
	existsSync,
	mkdirSync,
	readdirSync,
	unlinkSync,
} from "node:fs";
import { join } from "node:path";
import type { LogLevel, LoggerConfig } from "@types";
import { format } from "date-fns-tz";

class FileLogger {
	private stream: WriteStream | null = null;
	private filePath = "";
	private date = "";

	constructor(private readonly config: Required<LoggerConfig>) {
		if (!existsSync(this.config.directory)) {
			mkdirSync(this.config.directory, { recursive: true });
		}
	}

	private getLogFilePath(dateStr: string): string {
		return join(this.config.directory, `${dateStr}.jsonl`);
	}

	private resetStream(path: string): void {
		this.stream?.end();
		this.stream = createWriteStream(path, { flags: "a", encoding: "utf-8" });
		this.filePath = path;
	}

	private pruneOldLogs(): void {
		if (this.config.maxFiles && this.config.maxFiles < 1) {
			throw new Error("[@atums/echo] maxFiles must be >= 1 if set.");
		}

		const files = readdirSync(this.config.directory)
			.filter((file) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(file))
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
		let path: string;

		if (this.config.rotate) {
			const dateStr = format(now, "yyyy-MM-dd", {
				timeZone: this.config.timezone,
			});
			path = this.getLogFilePath(dateStr);

			if (!this.stream || this.filePath !== path || this.date !== dateStr) {
				this.date = dateStr;
				this.resetStream(path);
				this.pruneOldLogs();
			}
		} else {
			path = join(this.config.directory, "log.jsonl");

			if (!this.stream || this.filePath !== path) {
				this.resetStream(path);
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
