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

/**
 * AD data gate, mirroring the external benchmark's: before any model traffic,
 * the alerts AD will read (same index and time window) must hold at least
 * {@link AD_MIN_ENDPOINT_ALERTS} endpoint alerts and no Chrysalis signal.
 */
export const assertAdDataGate = async ({
  esClient,
  log,
  index,
  start,
  end,
}: {
  esClient: EsClient;
  log: ToolingLog;
  index: string;
  start: string;
  end: string;
}): Promise<void> => {
  const inWindow = { range: { '@timestamp': { gte: start, lt: end } } };
  const [{ count: endpoint }, { count: chrysalis }] = await Promise.all([
    esClient.count({
      index,
      query: { bool: { filter: [inWindow], must_not: [CHRYSALIS_SIGNAL_QUERY] } },
    }),
    esClient.count({ index, query: { bool: { filter: [inWindow, CHRYSALIS_SIGNAL_QUERY] } } }),
  ]);
  const summary = `endpoint=${endpoint} (min ${AD_MIN_ENDPOINT_ALERTS}), chrysalis=${chrysalis} (max 0)`;
  if (endpoint < AD_MIN_ENDPOINT_ALERTS || chrysalis > 0) {
    throw new Error(`Attack Discovery data gate failed in ${index} [${start}, ${end}): ${summary}`);
  }
  log.info(`[attack-discovery] data gate passed: ${summary}`);
};
