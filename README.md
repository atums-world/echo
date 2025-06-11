# @atums/echo

A minimal, flexible logger for Node with:

- Colored console output
- Daily `.jsonl` file logging
- Configurable output patterns and file naming
- Structured logs with caller metadata
- Fully typed config with environment/file/constructor override

---

## Features

- Console and file logging with level-based filtering
- Colored output with ANSI formatting
- Daily rotated `.jsonl` files with custom naming patterns
- Supports runtime configuration merging
- Auto-formatted output using custom patterns
- Includes caller file, line, and column
- Pretty-prints structured objects if enabled
- Flushes open file streams on exit
- Uses Biome and EditorConfig for formatting and linting

---

## Installation

```bash
bun add @atums/echo
```

---

## Usage

```ts
import { echo } from "@atums/echo";

echo.info("App started");
echo.debug({ state: "init", ok: true });

try {
	throw new Error("Something failed");
} catch (err) {
	echo.error(err);
}
```

---

## Configuration

Logger config can be defined in three ways:

1. JSON file (e.g. `logger.json`)
2. Environment variables
3. Constructor override

Priority (highest to lowest):

```
constructor > environment > logger.json > defaults
```

---

### logger.json example

```json
{
	"directory": "logs",
	"level": "debug",
	"disableFile": false,

	"rotate": true,
	"maxFiles": 3,
	"fileNameFormat": "yyyy-MM-dd",

	"console": true,
	"consoleColor": true,

	"dateFormat": "yyyy-MM-dd HH:mm:ss.SSS",
	"timezone": "local",

	"silent": false,

	"pattern": "{color:gray}{timestamp}{reset} {color:levelColor}[{level-name}]{reset} {color:gray}({reset}{file-name}:{line}:{column}{color:gray}){reset} {data}",
	"levelColor": {
		"debug": "blue",
		"info": "green",
		"warn": "yellow",
		"error": "red",
		"fatal": "red"
	},

	"customPattern": "{color:gray}{pretty-timestamp}{reset} {color:tagColor}[{tag}]{reset} {color:contextColor}({context}){reset} {data}",
	"customColors": {
		"GET": "red",
		"POST": "blue",
		"PUT": "yellow",
		"DELETE": "red",
		"PATCH": "cyan",
		"HEAD": "magenta",
		"OPTIONS": "white",
		"TRACE": "gray"
	},

	"prettyPrint": true
}
```

---

### Supported Environment Variables

| Variable               | Description                                   |
|------------------------|-----------------------------------------------|
| `LOG_LEVEL`            | Log level (`debug`, `info`, etc.)             |
| `LOG_LEVEL_COLOR`      | Comma-separated list of `TAG:color` pairs     |
| `LOG_DIRECTORY`        | Log directory path (default: `logs`)          |
| `LOG_DISABLE_FILE`     | Disable file output (`true` or `false`)       |
| `LOG_ROTATE`           | Enable daily rotation                         |
| `LOG_MAX_FILES`        | Max rotated files to keep                     |
| `LOG_FILE_NAME_FORMAT` | Custom file name format (default: yyyy-MM-dd) |
| `LOG_CONSOLE`          | Enable console output                         |
| `LOG_CONSOLE_COLOR`    | Enable ANSI color in console output           |
| `LOG_DATE_FORMAT`      | Date format for display timestamp             |
| `LOG_TIMEZONE`         | Timezone (`local` or IANA string)             |
| `LOG_SILENT`           | Completely disable output                     |
| `LOG_PATTERN`          | Custom log format for console                 |
| `LOG_PRETTY_PRINT`     | Pretty-print objects in console output        |
| `LOG_CUSTOM_PATTERN`   | Pattern used for `echo.custom()` logs         |
| `LOG_CUSTOM_COLORS`    | Comma-separated list of `TAG:color` pairs     |

---

### Custom File Naming
```json
{
  "fileNameFormat": "yyyy-MM-dd",        // 2025-06-03.jsonl
  "fileNameFormat": "yyyy-MM-dd_HH-mm",  // 2025-06-03_18-30.jsonl
  "fileNameFormat": "yyyyMMdd",          // 20250603.jsonl
}
```

---

## Pattern Tokens

These tokens are replaced in the log pattern:

| Token                | Description                                     |
|----------------------|-------------------------------------------------|
| `{timestamp}`        | ISO timestamp string                            |
| `{pretty-timestamp}` | Formatted display timestamp                     |
| `{level-name}`       | Uppercase log level (e.g. DEBUG)                |
| `{level}`            | Numeric log level                               |
| `{file-name}`        | Source filename                                 |
| `{line}`             | Line number in source                           |
| `{column}`           | Column number in source                         |
| `{data}`             | Formatted log data (message/object)             |
| `{id}`               | Unique short ID for the log                     |
| `{tag}`              | Custom tag used in `echo.custom()`              |
| `{context}`          | Custom context in `echo.custom()`              |
| `{color:*}`          | ANSI color start (e.g. `{color:red}`)           |
| `{color:levelColor}` | Dynamic color based on log level                |
| `{color:tagColor}`   | Color for custom tag                            |
| `{color:contextColor}`| Color for custom context                       |
| `{reset}`            | Resets console color                            |

---

## Custom Log Entries

You can log arbitrary tagged messages with `echo.custom(tag, context, message)`:

```ts
echo.custom("GET", "/health", { status: 200 });
```

The output format is controlled by:

- `customPattern` — e.g. `{pretty-timestamp} [GET] (/health) { status: 200 }`
- `customColors` — define colors for tags like `"GET": "green"`

### Example output

```
2025-05-24 16:22:00.123 [GET] (/health) { status: 200 }
```

---

## Output Examples

### Console

```
2025-05-24 16:15:00.000 [INFO] (index.ts:3:6) Server started
```

### File (`logs/2025-05-24.jsonl`)

Each line is structured JSON:

```json
{
  "timestamp": 1748115300000,
  "level": "info",
  "id": "aB4cD9xZ",
  "file": "index.ts",
  "line": "3",
  "column": "6",
  "data": "Server started"
}
```

If an error is logged:

```json
{
  "timestamp": 1748115301000,
  "level": "error",
  "id": "qW3eR7tU",
  "file": "index.ts",
  "line": "10",
  "column": "12",
  "data": {
    "name": "Error",
    "message": "Something failed",
    "stack": "Error: Something failed\n  at index.ts:10:12"
  }
}
```

---

## Development

This project uses:

- TypeScript
- Bun runtime
- Biome for formatting/linting
- JSONL for structured file output
- `date-fns-tz` for timezone support

---

## Images

<details>
<summary>Logger preview (pretty)</summary>

![Logger preview](https://git.creations.works/atums/echo/media/branch/main/demo/image.png)

</details>

<details>
<summary>Logger preview (no pretty)</summary>

![Logger preview no-pretty](https://git.creations.works/atums/echo/media/branch/main/demo/image-no-pretty.png)

</details>

---

## License

BSD 3-Clause [License](License)
