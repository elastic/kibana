/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Report item status for CLI output
 */
export type ReportStatus = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'skipped';

/**
 * Report item for structured output
 */
export interface ReportItem {
  label: string;
  value?: string | number | boolean;
  status?: ReportStatus;
  details?: string[];
}

/**
 * Table column definition
 */
export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

/**
 * Progress report state
 */
export interface ProgressState {
  current: number;
  total: number;
  label: string;
  startedAt: Date;
}

/**
 * Console reporter options
 */
export interface ConsoleReporterOptions {
  /** ToolingLog instance for output */
  log: ToolingLog;
  /** Enable verbose output */
  verbose?: boolean;
  /** Custom horizontal line character */
  lineChar?: string;
  /** Line width for separators */
  lineWidth?: number;
}

const STATUS_ICONS: Record<ReportStatus, string> = {
  success: '[OK]',
  error: '[FAIL]',
  warning: '[WARN]',
  info: '[INFO]',
  pending: '[...]',
  skipped: '[SKIP]',
};

const DEFAULT_LINE_WIDTH = 80;
const DEFAULT_LINE_CHAR = '-';

/**
 * ConsoleReporter provides structured CLI output using @kbn/tooling-log.
 *
 * Features:
 * - Formatted headers, sections, and separators
 * - Status indicators (success, error, warning, etc.)
 * - Table output with configurable columns
 * - Progress reporting with elapsed time
 * - Key-value pair formatting
 * - Verbose mode for detailed output
 */
export class ConsoleReporter {
  private readonly log: ToolingLog;
  private readonly verbose: boolean;
  private readonly lineChar: string;
  private readonly lineWidth: number;
  private readonly startedAt: Date;
  private progressState: ProgressState | null = null;

  constructor(options: ConsoleReporterOptions) {
    this.log = options.log;
    this.verbose = options.verbose ?? false;
    this.lineChar = options.lineChar ?? DEFAULT_LINE_CHAR;
    this.lineWidth = options.lineWidth ?? DEFAULT_LINE_WIDTH;
    this.startedAt = new Date();
  }

  /**
   * Get the underlying ToolingLog instance
   */
  getLog(): ToolingLog {
    return this.log;
  }

  /**
   * Create a horizontal line separator
   */
  private createLine(char?: string, width?: number): string {
    const c = char ?? this.lineChar;
    const w = width ?? this.lineWidth;
    return c.repeat(w);
  }

  /**
   * Format elapsed time as HH:MM:SS.ms
   */
  private formatElapsedTime(startTime: Date): string {
    const elapsed = Date.now() - startTime.getTime();
    const ms = elapsed % 1000;
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / 60000) % 60;
    const hours = Math.floor(elapsed / 3600000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Pad string to width with specified alignment
   */
  private padString(
    str: string,
    width: number,
    align: 'left' | 'right' | 'center' = 'left'
  ): string {
    const strLen = str.length;
    if (strLen >= width) return str.substring(0, width);

    const padding = width - strLen;
    switch (align) {
      case 'right':
        return ' '.repeat(padding) + str;
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
      default:
        return str + ' '.repeat(padding);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Output Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Write a blank line
   */
  blank(): void {
    this.log.write('');
  }

  /**
   * Write a horizontal separator line
   */
  separator(char?: string): void {
    this.log.write(this.createLine(char));
  }

  /**
   * Write a header with surrounding separators
   */
  header(title: string): void {
    const line = this.createLine('=');
    this.log.write(line);
    this.log.write(`  ${title}`);
    this.log.write(line);
  }

  /**
   * Write a section header
   */
  section(title: string): void {
    this.blank();
    this.log.write(`── ${title} ${'─'.repeat(Math.max(0, this.lineWidth - title.length - 4))}`);
  }

  /**
   * Write a subsection header
   */
  subsection(title: string): void {
    this.log.write(`  • ${title}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Logging Methods (delegated to ToolingLog)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log.info(message, ...args);
  }

  /**
   * Log a success message
   */
  success(message: string, ...args: unknown[]): void {
    this.log.success(message, ...args);
  }

  /**
   * Log a warning message
   */
  warning(message: string, ...args: unknown[]): void {
    this.log.warning(message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string | Error): void {
    this.log.error(message);
  }

  /**
   * Log a debug message (only when verbose)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      this.log.debug(message, ...args);
    }
  }

  /**
   * Log a verbose message (only when verbose)
   */
  verbose_(message: string, ...args: unknown[]): void {
    if (this.verbose) {
      this.log.verbose(message, ...args);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Structured Output Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Write a status line with icon
   */
  status(status: ReportStatus, message: string): void {
    const icon = STATUS_ICONS[status];
    const logMethod = this.getLogMethodForStatus(status);
    logMethod.call(this.log, `${icon} ${message}`);
  }

  /**
   * Get the appropriate log method for a status
   */
  private getLogMethodForStatus(status: ReportStatus): (msg: string) => void {
    switch (status) {
      case 'success':
        return this.log.success.bind(this.log);
      case 'error':
        return this.log.error.bind(this.log);
      case 'warning':
        return this.log.warning.bind(this.log);
      default:
        return this.log.info.bind(this.log);
    }
  }

  /**
   * Write a key-value pair
   */
  keyValue(key: string, value: string | number | boolean | undefined, indent = 0): void {
    const prefix = '  '.repeat(indent);
    const displayValue = value === undefined ? '<not set>' : String(value);
    this.log.write(`${prefix}${key}: ${displayValue}`);
  }

  /**
   * Write multiple key-value pairs
   */
  keyValues(
    items: Array<{ key: string; value: string | number | boolean | undefined }>,
    indent = 0
  ): void {
    const maxKeyLen = Math.max(...items.map((i) => i.key.length));
    for (const item of items) {
      const prefix = '  '.repeat(indent);
      const displayValue = item.value === undefined ? '<not set>' : String(item.value);
      this.log.write(`${prefix}${item.key.padEnd(maxKeyLen)}: ${displayValue}`);
    }
  }

  /**
   * Write a report item with status and details
   */
  reportItem(item: ReportItem): void {
    const status = item.status ?? 'info';
    const icon = STATUS_ICONS[status];
    const valueStr = item.value !== undefined ? `: ${item.value}` : '';
    this.status(status, `${item.label}${valueStr}`);

    if (item.details && item.details.length > 0) {
      for (const detail of item.details) {
        this.log.write(`      ${detail}`);
      }
    }
  }

  /**
   * Write multiple report items
   */
  reportItems(items: ReportItem[]): void {
    for (const item of items) {
      this.reportItem(item);
    }
  }

  /**
   * Write a bulleted list
   */
  list(items: string[], indent = 0): void {
    const prefix = '  '.repeat(indent);
    for (const item of items) {
      this.log.write(`${prefix}• ${item}`);
    }
  }

  /**
   * Write a numbered list
   */
  numberedList(items: string[], indent = 0): void {
    const prefix = '  '.repeat(indent);
    const numWidth = String(items.length).length;
    items.forEach((item, idx) => {
      const num = String(idx + 1).padStart(numWidth, ' ');
      this.log.write(`${prefix}${num}. ${item}`);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Table Output
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Write a formatted table
   */
  table<T extends Record<string, unknown>>(columns: TableColumn[], rows: T[]): void {
    if (rows.length === 0) {
      this.log.write('  (no data)');
      return;
    }

    // Calculate column widths
    const colWidths = columns.map((col) => {
      if (col.width) return col.width;
      const headerLen = col.header.length;
      const maxDataLen = Math.max(...rows.map((r) => String(r[col.key] ?? '').length));
      return Math.max(headerLen, maxDataLen);
    });

    // Header row
    const headerRow = columns
      .map((col, i) => this.padString(col.header, colWidths[i], col.align))
      .join(' | ');
    this.log.write(`  ${headerRow}`);

    // Separator
    const sepRow = colWidths.map((w) => '-'.repeat(w)).join('-+-');
    this.log.write(`  ${sepRow}`);

    // Data rows
    for (const row of rows) {
      const dataRow = columns
        .map((col, i) => this.padString(String(row[col.key] ?? ''), colWidths[i], col.align))
        .join(' | ');
      this.log.write(`  ${dataRow}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Progress Reporting
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start progress tracking
   */
  startProgress(label: string, total: number): void {
    this.progressState = {
      current: 0,
      total,
      label,
      startedAt: new Date(),
    };
    this.updateProgress(0);
  }

  /**
   * Update progress count
   */
  updateProgress(current: number): void {
    if (!this.progressState) return;

    this.progressState.current = current;
    const { label, total, startedAt } = this.progressState;
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const elapsed = this.formatElapsedTime(startedAt);

    this.log.info(`[${label}] ${current}/${total} (${pct}%) - elapsed: ${elapsed}`);
  }

  /**
   * Increment progress by one
   */
  incrementProgress(): void {
    if (this.progressState) {
      this.updateProgress(this.progressState.current + 1);
    }
  }

  /**
   * Complete progress tracking
   */
  completeProgress(): void {
    if (this.progressState) {
      const { label, total, startedAt } = this.progressState;
      const elapsed = this.formatElapsedTime(startedAt);
      this.log.success(`[${label}] completed ${total}/${total} (100%) - total time: ${elapsed}`);
      this.progressState = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Summary & Report Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Write a summary block
   */
  summary(title: string, items: Array<{ key: string; value: string | number | boolean }>): void {
    this.section(title);
    this.keyValues(items, 1);
  }

  /**
   * Write an execution report with timing
   */
  executionReport(options: {
    title: string;
    success: boolean;
    items?: ReportItem[];
    summary?: Array<{ key: string; value: string | number | boolean }>;
  }): void {
    const { title, success, items, summary } = options;
    const elapsed = this.formatElapsedTime(this.startedAt);

    this.blank();
    this.header(`${title} - ${success ? 'SUCCESS' : 'FAILED'}`);
    this.keyValue('Elapsed Time', elapsed);

    if (summary && summary.length > 0) {
      this.blank();
      this.keyValues(summary);
    }

    if (items && items.length > 0) {
      this.blank();
      this.reportItems(items);
    }

    this.separator('=');
  }

  /**
   * Get the total elapsed time since reporter creation
   */
  getElapsedTime(): string {
    return this.formatElapsedTime(this.startedAt);
  }

  /**
   * Get the start time
   */
  getStartedAt(): Date {
    return new Date(this.startedAt);
  }
}

/**
 * Create a ConsoleReporter instance
 */
export const createConsoleReporter = (options: ConsoleReporterOptions): ConsoleReporter => {
  return new ConsoleReporter(options);
};
