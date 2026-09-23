/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { CRITICAL_SEVERITY_THRESHOLD } from '@kbn/significant-events-schema';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';
import type { SeedContext, SeededQuery } from '../types';
import { deterministicId } from '../types';

const DETECTION_WORKFLOW_ID = 'system-significant-events-detection';
const DISCOVERY_WORKFLOW_ID = 'system-significant-events-discovery';
const WORKFLOW_TIMEOUT_MS = 10 * 60_000;
const WORKFLOW_POLL_INTERVAL_MS = 5_000;
const POST_DETECTION_EVENT_COUNT = 30;
const POST_DETECTION_OBSERVATION_MS = 65_000;

interface WorkflowExecution {
  status?: string;
  error?: unknown;
}

interface DetectionDocument {
  '@timestamp'?: string;
  detection_id?: string;
  rule_uuid?: string;
}

interface EventHit {
  title?: string;
  status?: string;
  signals?: Array<{ metadata?: { rule_uuid?: string } }>;
}

const delay = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));

async function runManagedWorkflow(
  workflowId: string,
  label: string,
  inputs: Record<string, unknown>,
  ctx: SeedContext,
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  const trigger = await kibanaRequest(
    config,
    'POST',
    `/api/workflows/workflow/${workflowId}/run`,
    { inputs },
    ctx.space
  );
  if (trigger.status >= 300) {
    throw new Error(
      `runDiscovery: ${label} trigger failed (HTTP ${trigger.status}): ${JSON.stringify(
        trigger.data
      )}`
    );
  }

  const executionId = (trigger.data as { workflowExecutionId?: string }).workflowExecutionId;
  if (!executionId) {
    throw new Error(`runDiscovery: ${label} did not return a workflow execution ID`);
  }

  log.info(`runDiscovery: ${label} workflow ${executionId} started`);
  const deadline = Date.now() + WORKFLOW_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const response = await kibanaRequest(
      config,
      'GET',
      `/api/workflows/executions/${executionId}`,
      undefined,
      ctx.space
    );
    if (response.status >= 300) {
      throw new Error(
        `runDiscovery: ${label} status failed (HTTP ${response.status}): ${JSON.stringify(
          response.data
        )}`
      );
    }

    const execution = response.data as WorkflowExecution;
    if (execution.status === 'completed') {
      return;
    }
    if (['failed', 'cancelled', 'timed_out', 'skipped'].includes(execution.status ?? '')) {
      throw new Error(
        `runDiscovery: ${label} workflow ${executionId} ended with status ${
          execution.status
        }: ${JSON.stringify(execution.error ?? '')}`
      );
    }
    await delay(WORKFLOW_POLL_INTERVAL_MS);
  }

  throw new Error(
    `runDiscovery: ${label} workflow ${executionId} did not complete within ${
      WORKFLOW_TIMEOUT_MS / 60_000
    } minutes`
  );
}

async function findPrimaryDetection(
  ctx: SeedContext,
  ruleIds: string[],
  esClient: Client
): Promise<Required<Pick<DetectionDocument, '@timestamp' | 'detection_id'>>> {
  await esClient.indices.refresh({
    index: '.significant_events-detections',
    ignore_unavailable: true,
  });
  const response = await esClient.search<DetectionDocument>({
    index: '.significant_events-detections',
    size: 1,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.space_ids': ctx.space } },
          { terms: { rule_uuid: ruleIds } },
          { exists: { field: 'detection_id' } },
          { range: { '@timestamp': { gte: ctx.generatedAt } } },
        ],
      },
    },
    sort: [{ '@timestamp': 'desc' }],
  });
  const detection = response.hits.hits[0]?._source;
  if (!detection?.['@timestamp'] || !detection.detection_id) {
    throw new Error(
      `runDiscovery: detection workflow completed but produced no detection for the seeded rules (${ruleIds.join(
        ', '
      )})`
    );
  }
  return {
    '@timestamp': detection['@timestamp'],
    detection_id: detection.detection_id,
  };
}

async function seedPostDetectionEvidence(
  ctx: SeedContext,
  query: SeededQuery,
  detection: Required<Pick<DetectionDocument, '@timestamp' | 'detection_id'>>,
  esClient: Client,
  log: ToolingLog
): Promise<void> {
  const [fromClause, ...pipeline] = query.esql.split('\n');
  if (!fromClause.trimStart().startsWith('FROM ')) {
    throw new Error(`runDiscovery: cannot add metadata to seeded query: ${query.esql}`);
  }
  const sampleResult = await esClient.esql.query({
    query: [`${fromClause} METADATA _index, _id`, ...pipeline, '| LIMIT 1'].join('\n'),
  });
  const sampleRow = sampleResult.values[0];
  if (!sampleRow) {
    throw new Error(`runDiscovery: seeded query "${query.title}" has no source event to clone`);
  }
  const sample = Object.fromEntries(
    sampleResult.columns.map(({ name }, index) => [name, sampleRow[index]])
  );
  const sourceIndex = sample._index;
  const sourceId = sample._id;
  if (typeof sourceIndex !== 'string' || typeof sourceId !== 'string') {
    throw new Error(`runDiscovery: source lookup for "${query.title}" returned no _index or _id`);
  }

  const sourceResponse = await esClient.get<Record<string, unknown>>({
    index: sourceIndex,
    id: sourceId,
  });
  if (!sourceResponse._source) {
    throw new Error(`runDiscovery: source event ${sourceIndex}/${sourceId} has no _source`);
  }

  const detectedAtMs = new Date(detection['@timestamp']).getTime();
  const operations: Array<BulkOperationContainer | Record<string, unknown>> = [];
  for (let index = 1; index <= POST_DETECTION_EVENT_COUNT; index++) {
    operations.push({
      create: {
        _index: ctx.streamName,
        _id: deterministicId(detection.detection_id, 'post-detection', String(index)),
      },
    });
    operations.push({
      ...sourceResponse._source,
      '@timestamp': new Date(detectedAtMs + index * 1_000).toISOString(),
    });
  }

  const bulkResponse = await esClient.bulk({ operations, refresh: 'wait_for' });
  if (bulkResponse.errors) {
    const failedItems = bulkResponse.items
      .filter((item) => item.create?.error && item.create.status !== 409)
      .slice(0, 5);
    if (failedItems.length > 0) {
      const reasons = failedItems.map((item) => JSON.stringify(item.create?.error)).join('; ');
      throw new Error(
        `runDiscovery: post-detection evidence bulk indexing failed (${failedItems.length} item(s)): ${reasons}`
      );
    }
  }

  log.info(
    `runDiscovery: seeded ${POST_DETECTION_EVENT_COUNT} post-detection event(s) for "${query.title}"`
  );
  const waitMs = detectedAtMs + POST_DETECTION_OBSERVATION_MS - Date.now();
  if (waitMs > 0) {
    log.info(
      `runDiscovery: waiting ${Math.ceil(
        waitMs / 1_000
      )}s for a complete post-detection observation window`
    );
    await delay(waitMs);
  }
}

export async function runDiscovery(
  ctx: SeedContext,
  seededQueries: SeededQuery[],
  esClient: Client,
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  const primaryQueries = seededQueries.filter(
    ({ severityScore }) => (severityScore ?? 0) >= CRITICAL_SEVERITY_THRESHOLD
  );
  if (primaryQueries.length === 0) {
    throw new Error('runDiscovery: scenario has no critical seeded query to discover');
  }

  await runManagedWorkflow(
    DETECTION_WORKFLOW_ID,
    'detection',
    {
      lookback: 'now-40m',
      bucketInterval: '1m',
      detectionIntervalMinutes: 10,
      targetCoverageMinutes: 10,
    },
    ctx,
    config,
    log
  );

  const ruleIds = primaryQueries.map(({ ruleId }) => ruleId);
  const detection = await findPrimaryDetection(ctx, ruleIds, esClient);
  await seedPostDetectionEvidence(ctx, primaryQueries[0], detection, esClient, log);

  await runManagedWorkflow(DISCOVERY_WORKFLOW_ID, 'discovery', {}, ctx, config, log);

  const params = new URLSearchParams({
    stream: ctx.streamName,
    from: ctx.generatedAt,
    perPage: '100',
  });
  const eventsResponse = await kibanaRequest(
    config,
    'GET',
    `/internal/significant_events/events?${params.toString()}`,
    undefined,
    ctx.space
  );
  if (eventsResponse.status >= 300) {
    throw new Error(
      `runDiscovery: event verification failed (HTTP ${eventsResponse.status}): ${JSON.stringify(
        eventsResponse.data
      )}`
    );
  }

  const primaryRuleIds = new Set(ruleIds);
  const hits = (eventsResponse.data as { hits?: EventHit[] }).hits ?? [];
  const event = hits.find(({ signals }) =>
    signals?.some(({ metadata }) => metadata?.rule_uuid && primaryRuleIds.has(metadata.rule_uuid))
  );
  if (!event) {
    throw new Error(
      `runDiscovery: workflow completed but produced no event linked to the seeded rules (${ruleIds.join(
        ', '
      )})`
    );
  }
  if (event.status !== 'open') {
    throw new Error(
      `runDiscovery: created event "${event.title ?? 'untitled'}" with status ${
        event.status ?? 'unknown'
      }, expected open`
    );
  }

  log.info(`runDiscovery: created active significant event "${event.title ?? 'untitled'}"`);
}
