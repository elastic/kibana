/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { ReportItem, ReportStatus, TableColumn, ProgressState } from './console_reporter';

/**
 * Output format for file reports
 */
export type FileReportFormat = 'json' | 'text' | 'csv' | 'markdown';

/**
 * File reporter options
 */
export interface FileReporterOptions {
  /** Base output directory for reports */
  outputDir: string;
  /** Output format (default: 'json') */
  format?: FileReportFormat;
  /** Include timestamp in filename (default: true) */
  includeTimestamp?: boolean;
  /** Pretty print JSON output (default: true) */
  prettyPrint?: boolean;
  /** Create output directory if it doesn't exist (default: true) */
  createDir?: boolean;
  /** File name prefix (default: 'report') */
  filePrefix?: string;
}

/**
 * Report data structure for file output
 */
export interface FileReportData {
  metadata: {
    title: string;
    generatedAt: string;
    elapsedTime?: string;
    format: FileReportFormat;
  };
  sections: FileReportSection[];
  summary?: Record<string, string | number | boolean>;
  items?: ReportItem[];
  tables?: FileReportTable[];
}

/**
 * Report section for file output
 */
export interface FileReportSection {
  type: 'header' | 'section' | 'subsection' | 'text' | 'status' | 'list';
  content: string;
  status?: ReportStatus;
  items?: string[];
}

/**
 * Table data for file output
 */
export interface FileReportTable {
  title?: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

const DEFAULT_FORMAT: FileReportFormat = 'json';
const DEFAULT_FILE_PREFIX = 'report';

/**
 * FileReporter provides structured file output for reports.
 *
 * Features:
 * - Multiple output formats (JSON, text, CSV, markdown)
 * - Configurable output paths
 * - Timestamped filenames
 * - Directory auto-creation
 * - Structured report data
 */
export class FileReporter {
  private readonly outputDir: string;
  private readonly format: FileReportFormat;
  private readonly includeTimestamp: boolean;
  private readonly prettyPrint: boolean;
  private readonly createDir: boolean;
  private readonly filePrefix: string;
  private readonly startedAt: Date;

  private reportData: FileReportData;
  private progressState: ProgressState | null = null;

  constructor(options: FileReporterOptions) {
    this.outputDir = options.outputDir;
    this.format = options.format ?? DEFAULT_FORMAT;
    this.includeTimestamp = options.includeTimestamp ?? true;
    this.prettyPrint = options.prettyPrint ?? true;
    this.createDir = options.createDir ?? true;
    this.filePrefix = options.filePrefix ?? DEFAULT_FILE_PREFIX;
    this.startedAt = new Date();

    this.reportData = this.initializeReportData();

    if (this.createDir) {
      this.ensureOutputDir();
    }
  }

  /**
   * Initialize empty report data structure
   */
  private initializeReportData(): FileReportData {
    return {
      metadata: {
        title: '',
        generatedAt: new Date().toISOString(),
        format: this.format,
      },
      sections: [],
      items: [],
      tables: [],
    };
  }

  /**
   * Ensure the output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate filename with optional timestamp
   */
  private generateFilename(customName?: string): string {
    const baseName = customName ?? this.filePrefix;
    const timestamp = this.includeTimestamp
      ? `_${this.startedAt.toISOString().replace(/[:.]/g, '-')}`
      : '';
    const extension = this.getFileExtension();
    return `${baseName}${timestamp}.${extension}`;
  }

  /**
   * Get file extension for the current format
   */
  private getFileExtension(): string {
    switch (this.format) {
      case 'json':
        return 'json';
      case 'csv':
        return 'csv';
      case 'markdown':
        return 'md';
      case 'text':
      default:
        return 'txt';
    }
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Output Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add a header to the report
   */
  header(title: string): void {
    this.reportData.metadata.title = title;
    this.reportData.sections.push({
      type: 'header',
      content: title,
    });
  }

  /**
   * Add a section header
   */
  section(title: string): void {
    this.reportData.sections.push({
      type: 'section',
      content: title,
    });
  }

  /**
   * Add a subsection header
   */
  subsection(title: string): void {
    this.reportData.sections.push({
      type: 'subsection',
      content: title,
    });
  }

  /**
   * Add text content
   */
  text(content: string): void {
    this.reportData.sections.push({
      type: 'text',
      content,
    });
  }

  /**
   * Add a status line
   */
  status(status: ReportStatus, message: string): void {
    this.reportData.sections.push({
      type: 'status',
      content: message,
      status,
    });
  }

  /**
   * Add a bulleted list
   */
  list(items: string[]): void {
    this.reportData.sections.push({
      type: 'list',
      content: '',
      items,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Structured Output Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add a report item
   */
  reportItem(item: ReportItem): void {
    if (!this.reportData.items) {
      this.reportData.items = [];
    }
    this.reportData.items.push(item);
  }

  /**
   * Add multiple report items
   */
  reportItems(items: ReportItem[]): void {
    for (const item of items) {
      this.reportItem(item);
    }
  }

  /**
   * Add key-value pair to summary
   */
  addSummaryItem(key: string, value: string | number | boolean): void {
    if (!this.reportData.summary) {
      this.reportData.summary = {};
    }
    this.reportData.summary[key] = value;
  }

  /**
   * Add a table to the report
   */
  table<T extends Record<string, unknown>>(
    columns: TableColumn[],
    rows: T[],
    title?: string
  ): void {
    if (!this.reportData.tables) {
      this.reportData.tables = [];
    }
    this.reportData.tables.push({
      title,
      columns,
      rows,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Progress Tracking
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
  }

  /**
   * Update progress count
   */
  updateProgress(current: number): void {
    if (this.progressState) {
      this.progressState.current = current;
    }
  }

  /**
   * Increment progress by one
   */
  incrementProgress(): void {
    if (this.progressState) {
      this.progressState.current++;
    }
  }

  /**
   * Complete progress tracking
   */
  completeProgress(): void {
    this.progressState = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // File Output Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Save the report to disk
   */
  save(customFilename?: string): string {
    const filename = this.generateFilename(customFilename);
    const filepath = path.join(this.outputDir, filename);

    this.reportData.metadata.elapsedTime = this.formatElapsedTime(this.startedAt);
    this.reportData.metadata.generatedAt = new Date().toISOString();

    const content = this.formatReport();
    fs.writeFileSync(filepath, content, 'utf-8');

    return filepath;
  }

  /**
   * Format the report based on the output format
   */
  private formatReport(): string {
    switch (this.format) {
      case 'json':
        return this.formatAsJson();
      case 'csv':
        return this.formatAsCsv();
      case 'markdown':
        return this.formatAsMarkdown();
      case 'text':
      default:
        return this.formatAsText();
    }
  }

  /**
   * Format report as JSON
   */
  private formatAsJson(): string {
    return this.prettyPrint
      ? JSON.stringify(this.reportData, null, 2)
      : JSON.stringify(this.reportData);
  }

  /**
   * Format report as plain text
   */
  private formatAsText(): string {
    const lines: string[] = [];
    const LINE_WIDTH = 80;
    const LINE_CHAR = '─';

    for (const section of this.reportData.sections) {
      switch (section.type) {
        case 'header':
          lines.push('═'.repeat(LINE_WIDTH));
          lines.push(`  ${section.content}`);
          lines.push('═'.repeat(LINE_WIDTH));
          lines.push('');
          break;
        case 'section':
          lines.push('');
          lines.push(
            `${LINE_CHAR}${LINE_CHAR} ${section.content} ${LINE_CHAR.repeat(
              Math.max(0, LINE_WIDTH - section.content.length - 4)
            )}`
          );
          break;
        case 'subsection':
          lines.push(`  • ${section.content}`);
          break;
        case 'text':
          lines.push(section.content);
          break;
        case 'status':
          const statusIcon = this.getStatusIcon(section.status ?? 'info');
          lines.push(`${statusIcon} ${section.content}`);
          break;
        case 'list':
          for (const item of section.items ?? []) {
            lines.push(`  • ${item}`);
          }
          break;
      }
    }

    if (this.reportData.summary && Object.keys(this.reportData.summary).length > 0) {
      lines.push('');
      lines.push(`${LINE_CHAR}${LINE_CHAR} Summary ${LINE_CHAR.repeat(LINE_WIDTH - 11)}`);
      for (const [key, value] of Object.entries(this.reportData.summary)) {
        lines.push(`  ${key}: ${value}`);
      }
    }

    if (this.reportData.items && this.reportData.items.length > 0) {
      lines.push('');
      lines.push(`${LINE_CHAR}${LINE_CHAR} Items ${LINE_CHAR.repeat(LINE_WIDTH - 9)}`);
      for (const item of this.reportData.items) {
        const statusIcon = this.getStatusIcon(item.status ?? 'info');
        const valueStr = item.value !== undefined ? `: ${item.value}` : '';
        lines.push(`${statusIcon} ${item.label}${valueStr}`);
        if (item.details) {
          for (const detail of item.details) {
            lines.push(`      ${detail}`);
          }
        }
      }
    }

    for (const table of this.reportData.tables ?? []) {
      lines.push('');
      if (table.title) {
        lines.push(
          `${LINE_CHAR}${LINE_CHAR} ${table.title} ${LINE_CHAR.repeat(
            LINE_WIDTH - table.title.length - 4
          )}`
        );
      }
      lines.push(this.formatTableAsText(table));
    }

    lines.push('');
    lines.push(`Generated: ${this.reportData.metadata.generatedAt}`);
    if (this.reportData.metadata.elapsedTime) {
      lines.push(`Elapsed Time: ${this.reportData.metadata.elapsedTime}`);
    }
    lines.push('═'.repeat(LINE_WIDTH));

    return lines.join('\n');
  }

  /**
   * Format table as plain text
   */
  private formatTableAsText(table: FileReportTable): string {
    if (table.rows.length === 0) {
      return '  (no data)';
    }

    const colWidths = table.columns.map((col) => {
      if (col.width) return col.width;
      const headerLen = col.header.length;
      const maxDataLen = Math.max(...table.rows.map((r) => String(r[col.key] ?? '').length));
      return Math.max(headerLen, maxDataLen);
    });

    const lines: string[] = [];

    // Header row
    const headerRow = table.columns
      .map((col, i) => this.padString(col.header, colWidths[i], col.align))
      .join(' | ');
    lines.push(`  ${headerRow}`);

    // Separator
    const sepRow = colWidths.map((w) => '-'.repeat(w)).join('-+-');
    lines.push(`  ${sepRow}`);

    // Data rows
    for (const row of table.rows) {
      const dataRow = table.columns
        .map((col, i) => this.padString(String(row[col.key] ?? ''), colWidths[i], col.align))
        .join(' | ');
      lines.push(`  ${dataRow}`);
    }

    return lines.join('\n');
  }

  /**
   * Format report as CSV (tables only)
   */
  private formatAsCsv(): string {
    const lines: string[] = [];

    // Metadata as comments
    lines.push(`# Report: ${this.reportData.metadata.title}`);
    lines.push(`# Generated: ${this.reportData.metadata.generatedAt}`);
    if (this.reportData.metadata.elapsedTime) {
      lines.push(`# Elapsed Time: ${this.reportData.metadata.elapsedTime}`);
    }
    lines.push('');

    // Tables
    for (const table of this.reportData.tables ?? []) {
      if (table.title) {
        lines.push(`# ${table.title}`);
      }

      // Header row
      const headers = table.columns.map((col) => this.escapeCsvValue(col.header));
      lines.push(headers.join(','));

      // Data rows
      for (const row of table.rows) {
        const values = table.columns.map((col) => this.escapeCsvValue(String(row[col.key] ?? '')));
        lines.push(values.join(','));
      }

      lines.push('');
    }

    // Items as table
    if (this.reportData.items && this.reportData.items.length > 0) {
      lines.push('# Items');
      lines.push('Status,Label,Value,Details');
      for (const item of this.reportData.items) {
        const row = [
          item.status ?? 'info',
          this.escapeCsvValue(item.label),
          this.escapeCsvValue(String(item.value ?? '')),
          this.escapeCsvValue((item.details ?? []).join('; ')),
        ];
        lines.push(row.join(','));
      }
    }

    return lines.join('\n');
  }

  /**
   * Escape CSV value
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Format report as Markdown
   */
  private formatAsMarkdown(): string {
    const lines: string[] = [];

    for (const section of this.reportData.sections) {
      switch (section.type) {
        case 'header':
          lines.push(`# ${section.content}`);
          lines.push('');
          break;
        case 'section':
          lines.push(`## ${section.content}`);
          lines.push('');
          break;
        case 'subsection':
          lines.push(`### ${section.content}`);
          lines.push('');
          break;
        case 'text':
          lines.push(section.content);
          lines.push('');
          break;
        case 'status':
          const statusEmoji = this.getStatusEmoji(section.status ?? 'info');
          lines.push(`${statusEmoji} ${section.content}`);
          lines.push('');
          break;
        case 'list':
          for (const item of section.items ?? []) {
            lines.push(`- ${item}`);
          }
          lines.push('');
          break;
      }
    }

    if (this.reportData.summary && Object.keys(this.reportData.summary).length > 0) {
      lines.push('## Summary');
      lines.push('');
      lines.push('| Key | Value |');
      lines.push('|-----|-------|');
      for (const [key, value] of Object.entries(this.reportData.summary)) {
        lines.push(`| ${key} | ${value} |`);
      }
      lines.push('');
    }

    if (this.reportData.items && this.reportData.items.length > 0) {
      lines.push('## Items');
      lines.push('');
      for (const item of this.reportData.items) {
        const statusEmoji = this.getStatusEmoji(item.status ?? 'info');
        const valueStr = item.value !== undefined ? `: ${item.value}` : '';
        lines.push(`${statusEmoji} **${item.label}**${valueStr}`);
        if (item.details && item.details.length > 0) {
          for (const detail of item.details) {
            lines.push(`  - ${detail}`);
          }
        }
      }
      lines.push('');
    }

    for (const table of this.reportData.tables ?? []) {
      if (table.title) {
        lines.push(`## ${table.title}`);
        lines.push('');
      }

      if (table.rows.length === 0) {
        lines.push('*No data*');
        lines.push('');
      } else {
        // Header row
        const headers = table.columns.map((col) => col.header);
        lines.push(`| ${headers.join(' | ')} |`);

        // Alignment row
        const alignments = table.columns.map((col) => {
          switch (col.align) {
            case 'right':
              return '---:';
            case 'center':
              return ':---:';
            default:
              return '---';
          }
        });
        lines.push(`| ${alignments.join(' | ')} |`);

        // Data rows
        for (const row of table.rows) {
          const values = table.columns.map((col) => String(row[col.key] ?? ''));
          lines.push(`| ${values.join(' | ')} |`);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
    lines.push(`*Generated: ${this.reportData.metadata.generatedAt}*`);
    if (this.reportData.metadata.elapsedTime) {
      lines.push(`*Elapsed Time: ${this.reportData.metadata.elapsedTime}*`);
    }

    return lines.join('\n');
  }

  /**
   * Get status icon for text output
   */
  private getStatusIcon(status: ReportStatus): string {
    const icons: Record<ReportStatus, string> = {
      success: '[OK]',
      error: '[FAIL]',
      warning: '[WARN]',
      info: '[INFO]',
      pending: '[...]',
      skipped: '[SKIP]',
    };
    return icons[status];
  }

  /**
   * Get status emoji for markdown output
   */
  private getStatusEmoji(status: ReportStatus): string {
    const emojis: Record<ReportStatus, string> = {
      success: ':white_check_mark:',
      error: ':x:',
      warning: ':warning:',
      info: ':information_source:',
      pending: ':hourglass:',
      skipped: ':fast_forward:',
    };
    return emojis[status];
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
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the output directory path
   */
  getOutputDir(): string {
    return this.outputDir;
  }

  /**
   * Get the current format
   */
  getFormat(): FileReportFormat {
    return this.format;
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

  /**
   * Get the raw report data
   */
  getReportData(): FileReportData {
    return { ...this.reportData };
  }

  /**
   * Reset the report data
   */
  reset(): void {
    this.reportData = this.initializeReportData();
  }
}

/**
 * Create a FileReporter instance
 */
export const createFileReporter = (options: FileReporterOptions): FileReporter => {
  return new FileReporter(options);
};
