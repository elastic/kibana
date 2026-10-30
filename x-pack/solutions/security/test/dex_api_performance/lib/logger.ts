/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export class Logger {
  constructor(
    private readonly prefix: string,
    private readonly minLevel: LogLevel = 'info'
  ) {}

  child(prefix: string): Logger {
    return new Logger(`${this.prefix}:${prefix}`, this.minLevel);
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.log('debug', msg, meta);
  }
  info(msg: string, meta?: Record<string, unknown>): void {
    this.log('info', msg, meta);
  }
  warn(msg: string, meta?: Record<string, unknown>): void {
    this.log('warn', msg, meta);
  }
  error(msg: string, meta?: Record<string, unknown>): void {
    this.log('error', msg, meta);
  }

  private log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    const ts = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const line = `[${ts}] [${level.toUpperCase().padEnd(5)}] [${this.prefix}] ${msg}${metaStr}`;
    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}
