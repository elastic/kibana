/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { StreamQuery } from '@kbn/significant-events-schema';
import type { SeedContext } from '../types';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { kibanaRequest } from '../lib/kibana';
import { computeRuleId } from '../../../server/lib/knowledge_indicators/helpers/compute_rule_id';

async function deleteByQuery(
  esClient: Client,
  index: string,
  query: QueryDslQueryContainer,
  log: ToolingLog
): Promise<void> {
  try {
    await esClient.deleteByQuery({ index, conflicts: 'proceed', refresh: true, query });
    log.info(`clean: deleted matching documents from ${index}`);
  } catch (err) {
    if (err instanceof errors.ResponseError && err.meta.statusCode === 404) {
      log.info(`clean: ${index} not found, skipping`);
      return;
    }
    throw err;
  }
}

const deleteByMatchAll = async (esClient: Client, index: string, log: ToolingLog): Promise<void> =>
  deleteByQuery(esClient, index, { match_all: {} }, log);

async function cleanDetectionAndEventHistory(
  esClient: Client,
  ruleIds: string[],
  space: string,
  log: ToolingLog
): Promise<void> {
  if (ruleIds.length === 0) {
    return;
  }

  let detectionIds: string[] = [];
  try {
    const detections = await esClient.search<{ detection_id?: string }>({
      index: '.significant_events-detections',
      size: 1000,
      _source: ['detection_id'],
      query: {
        bool: {
          filter: [{ terms: { rule_uuid: ruleIds } }, { term: { 'kibana.space_ids': space } }],
        },
      },
    });
    detectionIds = detections.hits.hits
      .map(({ _source: source }) => source?.detection_id)
      .filter((id): id is string => typeof id === 'string');
  } catch (err) {
    if (!(err instanceof errors.ResponseError) || err.meta.statusCode !== 404) {
      throw err;
    }
  }

  const detectionShould: QueryDslQueryContainer[] = [{ terms: { rule_uuid: ruleIds } }];
  if (detectionIds.length > 0) {
    detectionShould.push({ terms: { detection_id: detectionIds } });
  }
  await deleteByQuery(
    esClient,
    '.significant_events-detections',
    {
      bool: {
        filter: [{ term: { 'kibana.space_ids': space } }],
        should: detectionShould,
        minimum_should_match: 1,
      },
    },
    log
  );
  await deleteByQuery(
    esClient,
    '.significant_events-events',
    {
      bool: {
        filter: [
          { terms: { 'signals.metadata.rule_uuid': ruleIds } },
          { term: { 'kibana.space_ids': space } },
        ],
      },
    },
    log
  );
}

export async function cleanSeedData(
  ctx: SeedContext,
  esClient: Client,
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  await deleteByMatchAll(esClient, '.kibana_streams_features-*', log);

  // Local seed reset only: deleting an Alerting v2 rule leaves its historical `.rule-events`.
  // Resolve the rule ids before deleting queries so repeated seed runs do not retain stale
  // synthetic events. Discovery list needs a range; one hour keeps occurrence work cheap.
  const listPath = `/internal/streams/_queries?from=2020-01-01T00:00:00.000Z&to=2020-01-01T01:00:00.000Z&bucketSize=1h&streamNames=${encodeURIComponent(
    ctx.streamName
  )}&status=active&status=draft&perPage=1000`;
  const listRes = await kibanaRequest(config, 'GET', listPath, undefined, ctx.space);
  if (listRes.status >= 300) {
    throw new Error(`clean: failed to list queries (HTTP ${listRes.status})`);
  }
  const allQueries = (listRes.data as { queries: StreamQuery[] }).queries;
  const queryIds = allQueries.map((q) => q.id);
  const ruleIds = allQueries.map((query) =>
    computeRuleId(ctx.streamName, query.id, query.esql.query)
  );

  if (queryIds.length > 0) {
    await deleteByQuery(esClient, '.rule-events', { terms: { 'rule.id': ruleIds } }, log);
  }

  await cleanDetectionAndEventHistory(esClient, ruleIds, ctx.space, log);

  if (queryIds.length > 0) {
    const delRes = await kibanaRequest(
      config,
      'POST',
      '/internal/streams/queries/_bulk_delete',
      { queryIds },
      ctx.space
    );
    const failed =
      delRes.status >= 300 ? queryIds.length : ((delRes.data as { failed?: number }).failed ?? 0);
    if (failed > 0) {
      throw new Error(
        `clean: bulk delete queries failed (HTTP ${delRes.status}) ${JSON.stringify(delRes.data)}`
      );
    }
    log.info(`clean: deleted ${queryIds.length} query/queries from stream "${ctx.streamName}"`);
  }

  log.info(`clean: deleting data stream "${ctx.streamName}"`);
  try {
    await esClient.indices.deleteDataStream({ name: ctx.streamName });
  } catch (err) {
    if (!(err instanceof errors.ResponseError) || err.meta.statusCode !== 404) {
      throw err;
    }
    log.info(`clean: data stream "${ctx.streamName}" not found, skipping`);
  }

  log.info('clean: finished');
}
