/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { isValidTraceId } from '@opentelemetry/api';
import pRetry from 'p-retry';

const FILESTORE_READ = 'filestore.read';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: unknown[][];
}

const buildOrderedToolQuery = (traceId: string, indexPattern: string) =>
  `
FROM ${indexPattern}
| WHERE trace.id == "${traceId}"
  AND attributes.elastic.inference.span.kind == "TOOL"
| SORT @timestamp ASC
| EVAL tool_id = COALESCE(attributes.gen_ai.tool.name, name)
| WHERE tool_id IS NOT NULL
  AND tool_id != "${FILESTORE_READ}"
| KEEP @timestamp, tool_id
`.trim();

const buildSpanProbeQuery = (traceId: string) =>
  `
FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS span_count = COUNT(*)
`.trim();

const parseToolIds = (response: EsqlResponse): string[] => {
  const toolCol = response.columns.findIndex((column) => column.name === 'tool_id');
  if (toolCol === -1) {
    return [];
  }

  return response.values
    .map((row) => row[toolCol])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
};

export const readWorkflowAgentToolCalls = async ({
  traceEsClient,
  traceId,
  log,
  indexPattern = 'traces-agent_builder.*',
}: {
  traceEsClient: EsClient;
  traceId: string | undefined;
  log: ToolingLog;
  indexPattern?: string;
}): Promise<{ toolCallIds: string[]; unavailable: boolean }> => {
  if (!traceId || !isValidTraceId(traceId)) {
    return { toolCallIds: [], unavailable: true };
  }

  const fetch = async (): Promise<string[]> => {
    const probe = (await traceEsClient.esql.query({
      query: buildSpanProbeQuery(traceId),
    })) as unknown as EsqlResponse;

    const spanCount = (probe.values[0]?.[0] as number) ?? 0;
    if (spanCount === 0) {
      throw new Error(`No spans yet for trace ${traceId}`);
    }

    const tools = (await traceEsClient.esql.query({
      query: buildOrderedToolQuery(traceId, indexPattern),
    })) as unknown as EsqlResponse;

    return parseToolIds(tools);
  };

  try {
    const toolCallIds = await pRetry(fetch, {
      retries: 5,
      factor: 2,
      minTimeout: 2000,
      maxTimeout: 60_000,
      onFailedAttempt: (error) => {
        log.warning(
          `Tool-call trace query attempt ${error.attemptNumber} for ${traceId}; retrying...`
        );
      },
    });

    return { toolCallIds, unavailable: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warning(`Could not resolve tool calls for workflow trace ${traceId}: ${message}`);
    return { toolCallIds: [], unavailable: true };
  }
};
