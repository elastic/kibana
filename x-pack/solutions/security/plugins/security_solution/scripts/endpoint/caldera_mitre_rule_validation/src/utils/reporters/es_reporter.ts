/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

import type { ReportItem, ReportStatus, TableColumn, ProgressState } from './console_reporter';

/**
 * Elasticsearch reporter options
 */
export interface EsReporterOptions {
  /** Elasticsearch client instance */
  esClient: Client;
  /** Index name for storing reports */
  indexName: string;
  /** Create index if it doesn't exist (default: true) */
  createIndex?: boolean;
  /** Number of documents to buffer before bulk indexing (default: 100) */
  bulkSize?: number;
  /** Flush interval in milliseconds (default: 5000) */
  flushInterval?: number;
  /** Additional metadata to include in all documents */
  metadata?: Record<string, unknown>;
  /** Report run identifier (auto-generated if not provided) */
  runId?: string;
}

/**
 * Base document structure for Elasticsearch
 */
export interface EsReportDocument {
  '@timestamp': string;
  run_id: string;
  doc_type: 'report_item' | 'section' | 'table_row' | 'summary' | 'progress' | 'metadata';
  status?: ReportStatus;
  label?: string;
  value?: string | number | boolean;
  details?: string[];
  section_type?: 'header' | 'section' | 'subsection' | 'text' | 'status' | 'list';
  content?: string;
  items?: string[];
  table_name?: string;
  table_data?: Record<string, unknown>;
  progress?: {
    current: number;
    total: number;
    percentage: number;
    label: string;
    elapsed_ms: number;
  };
  summary?: Record<string, string | number | boolean>;
  metadata?: Record<string, unknown>;
}

/**
 * Table definition for ES output
 */
export interface EsReportTable {
  title?: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

const DEFAULT_BULK_SIZE = 100;
const DEFAULT_FLUSH_INTERVAL = 5000;

/**
 * EsReporter provides Elasticsearch export for validation results.
 *
 * Features:
 * - Bulk indexing with configurable batch size
 * - Automatic index creation with appropriate mappings
 * - Run-based grouping for report organization
 * - Support for all report types (items, sections, tables, progress)
 * - Automatic flushing on interval and explicit save
 */
export class EsReporter {
  private readonly esClient: Client;
  private readonly indexName: string;
  private readonly createIndex: boolean;
  private readonly bulkSize: number;
  private readonly flushInterval: number;
  private readonly metadata: Record<string, unknown>;
  private readonly runId: string;
  private readonly startedAt: Date;

  private documentBuffer: EsReportDocument[] = [];
  private progressState: ProgressState | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private indexCreated: boolean = false;
  private summaryData: Record<string, string | number | boolean> = {};
  private reportTitle: string = '';

  constructor(options: EsReporterOptions) {
    this.esClient = options.esClient;
    this.indexName = options.indexName;
    this.createIndex = options.createIndex ?? true;
    this.bulkSize = options.bulkSize ?? DEFAULT_BULK_SIZE;
    this.flushInterval = options.flushInterval ?? DEFAULT_FLUSH_INTERVAL;
    this.metadata = options.metadata ?? {};
    this.runId = options.runId ?? this.generateRunId();
    this.startedAt = new Date();

    this.startFlushTimer();
  }

  /**
   * Generate a unique run identifier
   */
  private generateRunId(): string {
    const timestamp = this.startedAt.toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `run-${timestamp}-${random}`;
  }

  /**
   * Start the periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(() => {
          // Silently ignore flush errors in timer
        });
      }, this.flushInterval);
    }
  }

  /**
   * Stop the flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Format elapsed time in milliseconds
   */
  private getElapsedMs(startTime: Date): number {
    return Date.now() - startTime.getTime();
  }

  /**
   * Format elapsed time as HH:MM:SS.ms
   */
  private formatElapsedTime(startTime: Date): string {
    const elapsed = this.getElapsedMs(startTime);
    const ms = elapsed % 1000;
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / 60000) % 60;
    const hours = Math.floor(elapsed / 3600000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Create base document with common fields
   */
  private createBaseDocument(
    docType: EsReportDocument['doc_type']
  ): Pick<EsReportDocument, '@timestamp' | 'run_id' | 'doc_type' | 'metadata'> {
    return {
      '@timestamp': new Date().toISOString(),
      run_id: this.runId,
      doc_type: docType,
      metadata: this.metadata,
    };
  }

  /**
   * Add document to buffer and flush if needed
   */
  private async bufferDocument(doc: EsReportDocument): Promise<void> {
    this.documentBuffer.push(doc);

    if (this.documentBuffer.length >= this.bulkSize) {
      await this.flush();
    }
  }

  /**
   * Ensure the index exists with proper mappings
   */
  private async ensureIndex(): Promise<void> {
    if (this.indexCreated || !this.createIndex) {
      return;
    }

    const exists = await this.esClient.indices.exists({ index: this.indexName });

    if (!exists) {
      await this.esClient.indices.create({
        index: this.indexName,
        mappings: {
          properties: this.getIndexMappings(),
        },
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
      });
    }

    this.indexCreated = true;
  }

  /**
   * Get index mappings for report documents
   */
  private getIndexMappings(): Record<string, MappingProperty> {
    return {
      '@timestamp': { type: 'date' },
      run_id: { type: 'keyword' },
      doc_type: { type: 'keyword' },
      status: { type: 'keyword' },
      label: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      value: { type: 'keyword' },
      details: { type: 'text' },
      section_type: { type: 'keyword' },
      content: { type: 'text' },
      items: { type: 'text' },
      table_name: { type: 'keyword' },
      table_data: { type: 'object', enabled: true },
      progress: {
        type: 'object',
        properties: {
          current: { type: 'integer' },
          total: { type: 'integer' },
          percentage: { type: 'float' },
          label: { type: 'keyword' },
          elapsed_ms: { type: 'long' },
        },
      },
      summary: { type: 'object', enabled: true },
      metadata: { type: 'object', enabled: true },
    };
  }

  /**
   * Flush buffered documents to Elasticsearch
   */
  async flush(): Promise<void> {
    if (this.documentBuffer.length === 0) {
      return;
    }

    await this.ensureIndex();

    const documents = [...this.documentBuffer];
    this.documentBuffer = [];

    const operations = documents.flatMap((doc) => [{ index: { _index: this.indexName } }, doc]);

    await this.esClient.bulk({
      operations,
      refresh: false,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Basic Output Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add a header to the report
   */
  async header(title: string): Promise<void> {
    this.reportTitle = title;
    const doc: EsReportDocument = {
      ...this.createBaseDocument('section'),
      section_type: 'header',
      content: title,
    };
    await this.bufferDocument(doc);
  }

  /**
   * Add a section header
   */
  async section(title: string): Promise<void> {
    const doc: EsReportDocument = {
      ...this.createBaseDocument('section'),
      section_type: 'section',
      content: title,
    };
    await this.bufferDocument(doc);
  }

  /**
   * Add a subsection header
   */
  async subsection(title: string): Promise<void> {
    const doc: EsReportDocument = {
      ...this.createBaseDocument('section'),
      section_type: 'subsection',
      content: title,
    };
    await this.bufferDocument(doc);
  }

  /**
   * Add text content
   */
  async text(content: string): Promise<void> {
    const doc: EsReportDocument = {
      ...this.createBaseDocument('section'),
      section_type: 'text',
      content,
    };
    await this.bufferDocument(doc);
  }

  /**
   * Add a status line
   */
  async status(status: ReportStatus, message: string): Promise<void> {
    const doc: EsReportDocument = {
      ...this.createBaseDocument('section'),
      section_type: 'status',
      status,
      content: message,
    };
    await this.bufferDocument(doc);
  }

  /**
   * Add a bulleted list
   */
  async list(items: string[]): Promise<void> {
    const doc: EsReportDocument = {
      ...this.createBaseDocument('section'),
      section_type: 'list',
      items,
    };
    await this.bufferDocument(doc);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Structured Output Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add a report item
   */
  async reportItem(item: ReportItem): Promise<void> {
    const doc: EsReportDocument = {
      ...this.createBaseDocument('report_item'),
      status: item.status,
      label: item.label,
      value: item.value,
      details: item.details,
    };
    await this.bufferDocument(doc);
  }

  /**
   * Add multiple report items
   */
  async reportItems(items: ReportItem[]): Promise<void> {
    for (const item of items) {
      await this.reportItem(item);
    }
  }

  /**
   * Add key-value pair to summary
   */
  addSummaryItem(key: string, value: string | number | boolean): void {
    this.summaryData[key] = value;
  }

  /**
   * Add a table to the report (indexes each row as a document)
   */
  async table<T extends Record<string, unknown>>(
    columns: TableColumn[],
    rows: T[],
    title?: string
  ): Promise<void> {
    for (const row of rows) {
      const doc: EsReportDocument = {
        ...this.createBaseDocument('table_row'),
        table_name: title,
        table_data: row,
      };
      await this.bufferDocument(doc);
    }
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
  async updateProgress(current: number): Promise<void> {
    if (!this.progressState) return;

    this.progressState.current = current;
    const { label, total, startedAt } = this.progressState;
    const percentage = total > 0 ? (current / total) * 100 : 0;

    const doc: EsReportDocument = {
      ...this.createBaseDocument('progress'),
      progress: {
        current,
        total,
        percentage,
        label,
        elapsed_ms: this.getElapsedMs(startedAt),
      },
    };
    await this.bufferDocument(doc);
  }

  /**
   * Increment progress by one
   */
  async incrementProgress(): Promise<void> {
    if (this.progressState) {
      await this.updateProgress(this.progressState.current + 1);
    }
  }

  /**
   * Complete progress tracking
   */
  async completeProgress(): Promise<void> {
    if (this.progressState) {
      const { label, total, startedAt } = this.progressState;
      const doc: EsReportDocument = {
        ...this.createBaseDocument('progress'),
        status: 'success',
        progress: {
          current: total,
          total,
          percentage: 100,
          label,
          elapsed_ms: this.getElapsedMs(startedAt),
        },
      };
      await this.bufferDocument(doc);
      this.progressState = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Finalization Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Save the final summary and flush all documents
   */
  async save(): Promise<string> {
    // Add final summary document
    const summaryDoc: EsReportDocument = {
      ...this.createBaseDocument('summary'),
      content: this.reportTitle,
      summary: {
        ...this.summaryData,
        elapsed_time: this.formatElapsedTime(this.startedAt),
        total_elapsed_ms: this.getElapsedMs(this.startedAt),
      },
    };
    await this.bufferDocument(summaryDoc);

    // Flush remaining documents
    await this.flush();

    // Refresh the index for immediate searchability
    await this.esClient.indices.refresh({ index: this.indexName });

    return this.runId;
  }

  /**
   * Close the reporter and cleanup resources
   */
  async close(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the run ID
   */
  getRunId(): string {
    return this.runId;
  }

  /**
   * Get the index name
   */
  getIndexName(): string {
    return this.indexName;
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
   * Get count of buffered documents
   */
  getBufferCount(): number {
    return this.documentBuffer.length;
  }

  /**
   * Get the summary data
   */
  getSummaryData(): Record<string, string | number | boolean> {
    return { ...this.summaryData };
  }
}

/**
 * Create an EsReporter instance
 */
export const createEsReporter = (options: EsReporterOptions): EsReporter => {
  return new EsReporter(options);
};
