/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { ToolDefinition } from '@kbn/inference-common';
import {
  MAX_SAMPLE_LOGS,
  MAX_CATEGORIES,
  MAX_CONTEXT_LOGS,
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_KEEP_FIELDS,
} from './constants';
import { truncateObservation, truncateCellValue, formatTabular } from './truncation';

export const INNER_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  search_logs: {
    description:
      'Search logs using the funnel approach. Returns a histogram (trend), total count, and up to 10 log samples in one query. This is your PRIMARY tool — use it iteratively to filter noise and drill down.',
    schema: {
      type: 'object' as const,
      properties: {
        query_string: {
          type: 'string' as const,
          description:
            'KQL query string. Use NOT clauses to filter noise. Examples: "*", "error.message: *", "NOT message: \\"GET /health\\" AND NOT kubernetes.namespace: \\"kube-system\\""',
        },
        t_start: {
          type: 'string' as const,
          description: 'Start of time range. Elasticsearch date math, e.g. "now-1h"',
        },
        t_end: {
          type: 'string' as const,
          description: 'End of time range. Elasticsearch date math, e.g. "now"',
        },
        t_bucket_size: {
          type: 'string' as const,
          description: 'Histogram bucket size. Examples: "5m", "1m", "30s", "1h"',
        },
        breakdown_field: {
          type: 'string' as const,
          description:
            'Optional field to break down the histogram by (e.g. "log.level", "service.name"). Adds a second dimension to the histogram for richer trend analysis.',
        },
      },
      required: ['query_string', 't_start', 't_end', 't_bucket_size'] as const,
    },
  },
  categorize_logs: {
    description:
      'Find common and rare log message patterns using ES|QL CATEGORIZE. Use "common" to find noise patterns to exclude, "rare" to find unusual messages worth investigating.',
    schema: {
      type: 'object' as const,
      properties: {
        query_string: {
          type: 'string' as const,
          description: 'KQL query string to scope the categorization',
        },
        t_start: {
          type: 'string' as const,
          description: 'Start of time range',
        },
        t_end: {
          type: 'string' as const,
          description: 'End of time range',
        },
        mode: {
          type: 'string' as const,
          enum: ['common', 'rare', 'both'] as const,
          description:
            'Which patterns to return: "common" (high-count, likely noise), "rare" (low-count, likely interesting), or "both"',
        },
      },
      required: ['query_string', 't_start', 't_end', 'mode'] as const,
    },
  },
  get_log_document: {
    description:
      'Fetch a single full log document by its _id for deep inspection. Use when a log sample looks interesting and you need the complete fields.',
    schema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string' as const,
          description: 'The _id of the document to fetch',
        },
        index: {
          type: 'string' as const,
          description: 'The specific index containing the document',
        },
      },
      required: ['document_id', 'index'] as const,
    },
  },
  execute_esql: {
    description:
      'Execute an arbitrary ES|QL query. Use as an escape hatch when the structured tools cannot express what you need (e.g., complex aggregations, joins, CHANGE_POINT).',
    schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'The full ES|QL query to execute',
        },
      },
      required: ['query'] as const,
    },
  },
  get_logs_in_context: {
    description:
      'Fetch a chronological timeline of logs around a specific log entry, pivoting on a shared entity. Use after finding a suspicious log to see what happened before and after on the same trace, container, host, service, or pod.',
    schema: {
      type: 'object' as const,
      properties: {
        timestamp: {
          type: 'string' as const,
          description:
            'ISO 8601 anchor timestamp of the log being investigated, e.g. "2026-02-25T14:05:23.000Z"',
        },
        context_field: {
          type: 'string' as const,
          enum: [
            'trace.id',
            'container.id',
            'host.name',
            'service.name',
            'kubernetes.pod.name',
          ] as const,
          description:
            'Field to pivot on. Use trace.id for distributed request tracing, or container.id/host.name/service.name/kubernetes.pod.name for co-located events.',
        },
        context_value: {
          type: 'string' as const,
          description: 'The value of the context field to filter on',
        },
        window: {
          type: 'string' as const,
          description:
            'Time window around the anchor timestamp, e.g. "5m", "2m", "30s". Defaults to "5m".',
        },
      },
      required: ['timestamp', 'context_field', 'context_value'] as const,
    },
  },
  answer: {
    description:
      'Provide your final root cause analysis. Call this when you have enough evidence to answer the original question.',
    schema: {
      type: 'object' as const,
      properties: {
        answer: {
          type: 'string' as const,
          description:
            'Clear root cause statement or investigation summary answering the original question',
        },
        evidence: {
          type: 'string' as const,
          description: 'Key log lines, timestamps, and entities that support the conclusion',
        },
        root_cause: {
          type: 'string' as const,
          description: 'One-line root cause if identified',
        },
        affected_entities: {
          type: 'string' as const,
          description: 'Comma-separated list of affected services, hosts, pods, etc.',
        },
      },
      required: ['answer', 'evidence'] as const,
    },
  },
};

interface InnerToolContext {
  esClient: ElasticsearchClient;
  index: string;
  start: string;
  end: string;
  logger: Logger;
}

interface ToolCallPayload {
  toolCallId: string;
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export async function executeInnerTool(
  toolCall: ToolCallPayload,
  ctx: InnerToolContext
): Promise<string> {
  const { name, arguments: args } = toolCall.function;

  try {
    switch (name) {
      case 'search_logs':
        return await executeSearchLogs(args, ctx);
      case 'categorize_logs':
        return await executeCategorizeLogs(args, ctx);
      case 'get_log_document':
        return await executeGetLogDocument(args, ctx);
      case 'get_logs_in_context':
        return await executeGetLogsInContext(args, ctx);
      case 'execute_esql':
        return await executeEsql(args, ctx);
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    ctx.logger.error(`Inner tool "${name}" failed: ${error.message}`);
    return `Error executing ${name}: ${error.message}`;
  }
}

async function executeSearchLogs(
  args: Record<string, unknown>,
  ctx: InnerToolContext
): Promise<string> {
  const queryString = (args.query_string as string) || '*';
  const tStart = (args.t_start as string) || ctx.start;
  const tEnd = (args.t_end as string) || ctx.end;
  const tBucketSize = (args.t_bucket_size as string) || '5m';
  const breakdownField = args.breakdown_field as string | undefined;
  const keepFields = DEFAULT_KEEP_FIELDS.join(', ');

  const histogramGroupBy = breakdownField
    ? `bucket = BUCKET(@timestamp, ${tBucketSize}), ${breakdownField}`
    : `bucket = BUCKET(@timestamp, ${tBucketSize})`;

  const query = [
    `SET approximation = true`,
    `FROM ${ctx.index} METADATA _id, _index`,
    `| WHERE @timestamp >= TO_DATETIME("${tStart}") AND @timestamp <= TO_DATETIME("${tEnd}")`,
    `| WHERE KQL("${escapeQueryString(queryString)}")`,
    `| FORK`,
    `  (STATS count = COUNT(*) BY ${histogramGroupBy} | SORT bucket)`,
    `  (STATS total = COUNT(*))`,
    `  (SORT @timestamp DESC | LIMIT ${MAX_SAMPLE_LOGS} | KEEP _id, _index, @timestamp, ${keepFields})`,
  ].join('\n');

  const result = await runEsqlQuery(ctx.esClient, query);
  return truncateObservation(formatSearchLogsResult(result, tBucketSize));
}

async function executeCategorizeLogs(
  args: Record<string, unknown>,
  ctx: InnerToolContext
): Promise<string> {
  const queryString = (args.query_string as string) || '*';
  const tStart = (args.t_start as string) || ctx.start;
  const tEnd = (args.t_end as string) || ctx.end;
  const mode = (args.mode as string) || 'both';

  const forks: string[] = [];

  if (mode === 'common' || mode === 'both') {
    forks.push(
      `(STATS count = COUNT(*) BY category = CATEGORIZE(message) | SORT count DESC | LIMIT ${MAX_CATEGORIES})`
    );
  }
  if (mode === 'rare' || mode === 'both') {
    forks.push(
      `(STATS count = COUNT(*) BY category = CATEGORIZE(message) | SORT count ASC | LIMIT ${MAX_CATEGORIES})`
    );
  }

  const query = [
    `SET approximation = true`,
    `FROM ${ctx.index}`,
    `| WHERE @timestamp >= TO_DATETIME("${tStart}") AND @timestamp <= TO_DATETIME("${tEnd}")`,
    `| WHERE KQL("${escapeQueryString(queryString)}")`,
    `| FORK`,
    ...forks.map((f) => `  ${f}`),
  ].join('\n');

  const result = await runEsqlQuery(ctx.esClient, query);
  return truncateObservation(formatCategorizeResult(result, mode));
}

async function executeGetLogDocument(
  args: Record<string, unknown>,
  ctx: InnerToolContext
): Promise<string> {
  const documentId = args.document_id as string;
  const index = (args.index as string) || ctx.index;

  const response = await ctx.esClient.get({ index, id: documentId });
  const source = response._source as Record<string, unknown> | undefined;

  if (!source) {
    return 'Document not found or has no _source.';
  }

  const lines = flattenObject(source).map(
    ([key, value]) => `${key}: ${truncateCellValue(value)}`
  );

  return truncateObservation(lines.join('\n'));
}

async function executeGetLogsInContext(
  args: Record<string, unknown>,
  ctx: InnerToolContext
): Promise<string> {
  const timestamp = args.timestamp as string;
  const contextField = args.context_field as string;
  const contextValue = args.context_value as string;
  const window = (args.window as string) || DEFAULT_CONTEXT_WINDOW;

  const anchorMs = new Date(timestamp).getTime();
  const windowMs = parseWindowToMs(window);
  const windowStart = new Date(anchorMs - windowMs).toISOString();
  const windowEnd = new Date(anchorMs + windowMs).toISOString();
  const keepFields = DEFAULT_KEEP_FIELDS.join(', ');

  const query = [
    `FROM ${ctx.index}`,
    `| WHERE @timestamp >= TO_DATETIME("${windowStart}") AND @timestamp <= TO_DATETIME("${windowEnd}")`,
    `| WHERE KQL("${contextField}: \\"${escapeQueryString(contextValue)}\\"")`,
    `| SORT @timestamp`,
    `| LIMIT ${MAX_CONTEXT_LOGS}`,
    `| KEEP @timestamp, ${keepFields}`,
  ].join('\n');

  const result = await runEsqlQuery(ctx.esClient, query);

  if (!result.columns?.length || !result.values?.length) {
    return `No logs found for ${contextField}="${contextValue}" within ±${window} of ${timestamp}.`;
  }

  const header = `## Logs in context (${result.values.length} logs for ${contextField}="${contextValue}", ±${window} around ${timestamp})`;
  const table = formatTabular(result.columns, result.values);
  return truncateObservation(`${header}\n${table}`);
}

async function executeEsql(
  args: Record<string, unknown>,
  ctx: InnerToolContext
): Promise<string> {
  const query = args.query as string;

  const result = await runEsqlQuery(ctx.esClient, query);

  if (!result.columns?.length || !result.values?.length) {
    return '(no results)';
  }

  const maxRows = 50;
  const truncatedValues =
    result.values.length > maxRows ? result.values.slice(0, maxRows) : result.values;
  const table = formatTabular(result.columns, truncatedValues);
  const suffix =
    result.values.length > maxRows
      ? `\n[... showing ${maxRows} of ${result.values.length} rows]`
      : '';

  return truncateObservation(table + suffix);
}

interface EsqlResult {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

async function runEsqlQuery(esClient: ElasticsearchClient, query: string): Promise<EsqlResult> {
  const response = await esClient.transport.request<EsqlResult>({
    method: 'POST',
    path: '/_query',
    body: {
      query,
      format: 'json',
      drop_null_columns: true,
    },
  });

  return {
    columns: response.columns ?? [],
    values: response.values ?? [],
  };
}

function formatSearchLogsResult(result: EsqlResult, _bucketSize: string): string {
  if (!result.columns?.length || !result.values?.length) {
    return 'No matching logs found.';
  }

  const forkColIdx = result.columns.findIndex((c) => c.name === '_fork');
  const sections: string[] = [];

  if (forkColIdx >= 0) {
    const grouped = groupByFork(result, forkColIdx);

    if (grouped['fork1']?.values.length) {
      sections.push(formatHistogramFork(grouped['fork1']));
    }
    if (grouped['fork2']?.values.length) {
      sections.push(formatTotalCountFork(grouped['fork2']));
    }
    if (grouped['fork3']?.values.length) {
      sections.push(formatSamplesFork(grouped['fork3']));
    }
  } else {
    sections.push(formatTabular(result.columns, result.values));
  }

  return sections.join('\n\n');
}

function formatCategorizeResult(result: EsqlResult, mode: string): string {
  if (!result.columns?.length || !result.values?.length) {
    return 'No log patterns found.';
  }

  const forkColIdx = result.columns.findIndex((c) => c.name === '_fork');

  if (forkColIdx >= 0) {
    const grouped = groupByFork(result, forkColIdx);
    const sections: string[] = [];

    if (grouped['fork1']?.values.length) {
      const label = mode === 'both' ? 'Common patterns (noise candidates)' : 'Patterns';
      sections.push(`## ${label}\n${formatCategoryRows(grouped['fork1'])}`);
    }
    if (grouped['fork2']?.values.length) {
      const label = mode === 'both' ? 'Rare patterns (investigation candidates)' : 'Patterns';
      sections.push(`## ${label}\n${formatCategoryRows(grouped['fork2'])}`);
    }

    return sections.join('\n\n');
  }

  return formatCategoryRows(result);
}

function formatCategoryRows(result: EsqlResult): string {
  const countIdx = result.columns.findIndex((c) => c.name === 'count');
  const catIdx = result.columns.findIndex((c) => c.name === 'category');

  if (countIdx < 0 || catIdx < 0) {
    return formatTabular(result.columns, result.values);
  }

  return result.values
    .map((row) => `[${row[countIdx]}] ${truncateCellValue(row[catIdx])}`)
    .join('\n');
}

function formatHistogramFork(fork: EsqlResult): string {
  const bucketIdx = fork.columns.findIndex((c) => c.name === 'bucket');
  const countIdx = fork.columns.findIndex((c) => c.name === 'count');

  if (bucketIdx < 0 || countIdx < 0) {
    return formatTabular(fork.columns, fork.values);
  }

  const breakdownIdx = fork.columns.findIndex(
    (c) => c.name !== 'bucket' && c.name !== 'count'
  );
  const hasBreakdown = breakdownIdx >= 0;

  const maxCount = Math.max(...fork.values.map((r) => Number(r[countIdx]) || 0), 1);

  const lines = fork.values.map((row) => {
    const bucket = String(row[bucketIdx] ?? '');
    const count = Number(row[countIdx]) || 0;
    const barLen = Math.round((count / maxCount) * 30);
    const bar = '='.repeat(barLen);
    const breakdownLabel = hasBreakdown ? ` (${String(row[breakdownIdx] ?? 'unknown')})` : '';
    return `${bucket}${breakdownLabel} [${bar} ${count}]`;
  });

  const breakdownNote = hasBreakdown
    ? ` by ${fork.columns[breakdownIdx].name}`
    : '';
  return `## Histogram (trend${breakdownNote})\n${lines.join('\n')}`;
}

function formatTotalCountFork(fork: EsqlResult): string {
  const countIdx = fork.columns.findIndex((c) => c.name === 'total');
  if (countIdx >= 0 && fork.values.length > 0) {
    return `## Total matching logs: ${fork.values[0][countIdx]}`;
  }
  return `## Total matching logs: ${formatTabular(fork.columns, fork.values)}`;
}

function formatSamplesFork(fork: EsqlResult): string {
  const header = `## Log samples (${fork.values.length})`;
  const table = formatTabular(fork.columns, fork.values);
  return `${header}\n${table}`;
}

interface GroupedForkResult {
  [forkId: string]: EsqlResult;
}

function groupByFork(result: EsqlResult, forkColIdx: number): GroupedForkResult {
  const grouped: GroupedForkResult = {};

  for (const row of result.values) {
    const forkId = String(row[forkColIdx] ?? 'unknown');
    if (!grouped[forkId]) {
      grouped[forkId] = {
        columns: result.columns.filter((_, i) => i !== forkColIdx),
        values: [],
      };
    }
    grouped[forkId].values.push(row.filter((_, i) => i !== forkColIdx));
  }

  return grouped;
}

function parseWindowToMs(window: string): number {
  const match = window.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    return 5 * 60 * 1000;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return 5 * 60 * 1000;
  }
}

function escapeQueryString(qs: string): string {
  return qs.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Array<[string, unknown]> {
  const result: Array<[string, unknown]> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result.push([fullKey, value]);
    }
  }

  return result;
}
