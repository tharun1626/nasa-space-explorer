const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const LOG_LEVEL = String(process.env.LOG_LEVEL || "info").toLowerCase();
const ACTIVE_LEVEL = LEVELS[LOG_LEVEL] ?? LEVELS.info;

function safeSerialize(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  return value;
}

function baseEvent(level, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(payload, (_, value) => safeSerialize(value));
}

function write(level, message, meta = {}) {
  if ((LEVELS[level] ?? 99) > ACTIVE_LEVEL) return;
  const line = baseEvent(level, message, meta);
  if (level === "error" || level === "warn") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

export const logger = {
  error: (message, meta) => write("error", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  info: (message, meta) => write("info", message, meta),
  http: (message, meta) => write("http", message, meta),
  debug: (message, meta) => write("debug", message, meta),
};
