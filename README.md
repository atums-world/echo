# @atums/echo

A minimal, flexible logger for Node

## Features

- Console and file logging with level-based filtering
- Multiple arguments per log call with automatic formatting
- Colored output with ANSI formatting
- Daily rotated `.jsonl` files with custom naming patterns
- Supports runtime configuration merging
- Auto-formatted output using custom patterns
- Includes caller file, line, and column
- Pretty-prints structured objects if enabled
- Safe handling of circular references and complex objects
- Flushes open file streams on exit
- Uses Biome and EditorConfig for formatting and linting

---

## Installation

```bash
bun add @atums/echo
```

---

## Usage

### Basic Logging

```ts
import { echo } from "@atums/echo";

// Single arguments
echo.info("App started");
echo.debug({ state: "init", ok: true });

// Multiple arguments - all joined with spaces in console
echo.info("User login:", { userId: 123, ip: "192.168.1.1" });
echo.warn("Rate limit exceeded:", 429, { endpoint: "/api/users" });
echo.error("Database error:", error, { query: "SELECT * FROM users" });
```

### Error Handling

```ts
try {
	throw new Error("Something failed");
} catch (err) {
	// Single error
	echo.error(err);

	// Error with context
	echo.error("Operation failed:", err, { userId: 123, operation: "login" });

	// Multiple context items
	echo.fatal("Critical error:", err, "System shutting down", { timestamp: Date.now() });
}
```

### Multiple Data Types

```ts
// Mix any data types
echo.info("Processing:", 42, true, { batch: "A1" }, ["item1", "item2"]);
echo.debug("State:", "active", { connections: 5 }, null, undefined);
echo.warn("Alert:", "High CPU usage:", 95.2, "%", { threshold: 80 });
```

### API Request Logging

```ts
// Custom tagged logs for HTTP requests
echo.custom("GET", "/api/users", { status: 200, duration: "15ms" });
echo.custom("POST", "/api/auth", { status: 401, error: "Invalid token" });

// Standard logs with request context
echo.info("API Request:", "GET /health", { status: 200, responseTime: "5ms" });
echo.error("API Error:", "POST /users", 500, { error: "Database timeout" });
```

---

## Log Levels

All log levels support multiple arguments:

```ts
echo.trace("Trace message:", data1, data2);
echo.debug("Debug info:", object, array, "string");
echo.info("Information:", value1, value2, value3);
echo.warn("Warning:", message, errorCode, context);
echo.error("Error occurred:", error, additionalData);
echo.fatal("Fatal error:", error, "system", "shutdown");
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
| `{data}`             | Formatted log data                              |
| `{id}`               | Unique short ID for the log                     |
| `{tag}`              | Custom tag used in `echo.custom()`              |
| `{context}`          | Custom context in `echo.custom()`               |
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
echo.custom("WEBHOOK", "payment_received", { amount: 99.99, userId: "abc123" });
echo.custom("CRON", "daily_backup", { files: 1420, duration: "2m 15s" });
```

The output format is controlled by:

- `customPattern` — e.g. `{pretty-timestamp} [GET] (/health) { status: 200 }`
- `customColors` — define colors for tags like `"GET": "green"`

### Example output

```
2025-05-24 16:22:00.123 [GET] (/health) { status: 200 }
2025-05-24 16:22:01.456 [WEBHOOK] (payment_received) { amount: 99.99, userId: "abc123" }
```

---

## Output Examples

### Console Output

**Single argument:**
```
2025-05-24 16:15:00.000 [INFO] (index.ts:3:6) Server started
```

**Multiple arguments:**
```
2025-05-24 16:15:01.123 [ERROR] (index.ts:8:6) Database error: Error: Connection timeout {
  query: 'SELECT * FROM users',
  duration: '5s'
}
```

**Mixed data types:**
```
2025-05-24 16:15:02.456 [WARN] (index.ts:12:6) Rate limit: 429 exceeded for /api/users {
  ip: '192.168.1.1',
  attempts: 15
}
```

### File Output (`logs/2025-05-24.jsonl`)

**Single argument JSON:**
```json
{
  "timestamp": 1748115300000,
  "level": "info",
  "id": "aB4cD9xZ",
  "file": "index.ts",
  "line": "3",
  "column": "6",
  "data": ["Server started"]
}
```

**Multiple arguments JSON:**
```json
{
  "timestamp": 1748115301123,
  "level": "error",
  "id": "qW3eR7tU",
  "file": "index.ts",
  "line": "8",
  "column": "6",
  "data": [
    "Database error:",
    {
      "name": "Error",
      "message": "Connection timeout",
      "stack": "Error: Connection timeout\n  at index.ts:8:6"
    },
    {
      "query": "SELECT * FROM users",
      "duration": "5s"
    }
  ]
}
```

**Custom log JSON:**
```json
{
  "timestamp": 1748115302456,
  "level": "GET",
  "id": "mN8oP2qR",
  "file": "index.ts",
  "line": "15",
  "column": "6",
  "data": {
    "context": "/health",
    "data": { "status": 200 }
  }
}
```

---

## Advanced Features

### Circular Reference Handling

The logger safely handles circular references without crashing:

```ts
const obj = { name: "test" };
obj.self = obj; // Creates circular reference

echo.info("Circular object:", obj); // Works safely
// Console: Shows <ref *1> { name: 'test', self: [Circular *1] }
// File: Stores { "name": "test", "self": "[Circular Reference]" }
```

### Error Object Serialization

Error objects are automatically converted to structured data:

```ts
const error = new Error("Something failed");
echo.error("Operation failed:", error, { userId: 123 });

// File output includes:
// {
//   "name": "Error",
//   "message": "Something failed",
//   "stack": "Error: Something failed\n  at ..."
// }
```

### Performance Considerations

The logger handles rapid logging efficiently:

```ts
for (let i = 0; i < 1000; i++) {
  echo.debug("Processing item:", i, { batch: "A1", progress: i/1000 });
}
// All logs are processed without blocking
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
