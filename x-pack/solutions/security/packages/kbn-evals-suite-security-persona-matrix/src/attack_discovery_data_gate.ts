/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

/** Fewest non-Chrysalis alerts AD may read; the deduped corpus holds 95. */
export const AD_MIN_ENDPOINT_ALERTS = 80;

/**
 * Most corpus alerts AD may read: the snapshot holds 95, so a higher count means the corpus
 * ids were captured from more than the restored snapshot. Non-corpus alerts in the window
 * are counted separately as foreign and fail the gate on their own.
 */
export const AD_MAX_ENDPOINT_ALERTS = 95;

/**
 * Chrysalis signals as the external benchmark identifies them: its passthrough
 * rule, or the simulated target host the agent-builder seeds write to. Any of
 * them in AD's window pollutes the kill-chain ground truth without an error.
 */
const CHRYSALIS_SIGNAL_QUERY = {
  bool: {
    should: [
      { term: { 'kibana.alert.rule.name': 'Chrysalis Sim Passthrough' } },
      { term: { 'host.name': 'srv-win-defend-01' } },
    ],
    minimum_should_match: 1,
  },
};

/** Mirrors the external benchmark's AD data gate; call it before any model traffic. */
export const assertAdDataGate = async ({
  esClient,
  log,
  index,
  start,
  end,
  corpusIds,
}: {
  esClient: EsClient;
  log: ToolingLog;
  index: string;
  start: string;
  end: string;
  /**
   * `_id`s of the restored corpus, captured right after the snapshot restore.
   * The floor/max count only alerts positively identified as corpus docs.
   */
  corpusIds: string[];
}): Promise<void> => {
  const inWindow = { range: { '@timestamp': { gte: start, lt: end } } };
  const corpusIdsFilter = { ids: { values: corpusIds } };
  const [{ count: corpus }, { count: chrysalis }, { count: foreign }] = await Promise.all([
    esClient.count({
      index,
      query: {
        bool: { filter: [inWindow, corpusIdsFilter], must_not: [CHRYSALIS_SIGNAL_QUERY] },
      },
    }),
    esClient.count({ index, query: { bool: { filter: [inWindow, CHRYSALIS_SIGNAL_QUERY] } } }),
    esClient.count({
      index,
      query: {
        bool: { filter: [inWindow], must_not: [CHRYSALIS_SIGNAL_QUERY, corpusIdsFilter] },
      },
    }),
  ]);
  const summary = `corpus=${corpus} (min ${AD_MIN_ENDPOINT_ALERTS}, max ${AD_MAX_ENDPOINT_ALERTS}), foreign=${foreign} (max 0), chrysalis=${chrysalis} (max 0)`;
  if (
    corpus < AD_MIN_ENDPOINT_ALERTS ||
    corpus > AD_MAX_ENDPOINT_ALERTS ||
    foreign > 0 ||
    chrysalis > 0
  ) {
    throw new Error(`Attack Discovery data gate failed in ${index} [${start}, ${end}): ${summary}`);
  }
  log.info(`[attack-discovery] data gate passed: ${summary}`);
};
