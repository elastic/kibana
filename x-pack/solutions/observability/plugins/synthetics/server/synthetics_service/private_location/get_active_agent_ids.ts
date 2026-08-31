/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';
import { getAPIKeyForSyntheticsService } from '../get_api_key';
import { getFakeKibanaRequest } from '../utils/fake_kibana_request';
import type { SyntheticsServerSetup } from '../../types';

/**
 * Data-plane liveness signal: which of the given agents have written a
 * `synthetics-*` document within `windowMs`. A running Heartbeat keeps indexing
 * results even when its Fleet check-in is failing (the control plane is easily
 * disrupted by proxy idle-timeouts, Fleet Server restarts or network blips),
 * so a recent write is proof an agent is alive and executing — used to veto a
 * false-positive staleness eviction that would move monitors it is still
 * running (a real at-most-once break).
 *
 * Only ever used to *keep* an agent, never to trigger an eviction: an agent with
 * no assigned monitors (or only long-schedule ones) legitimately writes nothing,
 * so absence of data is ambiguous and falls back to the check-in signal.
 *
 * The task runs as `kibana_system`, which cannot read `synthetics-*`; we query
 * as the synthetics service API key (the same credential Heartbeat uses).
 * Correlation is on `agent.id` because synthetics documents carry `agent.id`,
 * not `host.name`. Best-effort: any failure returns an empty set so the caller
 * falls back to check-ins alone — this never triggers an eviction, only prevents
 * one.
 */
export const getRecentlyActiveAgentIds = async (
  server: SyntheticsServerSetup,
  agentIds: string[],
  windowMs: number,
  now: number,
  signal: AbortSignal
): Promise<Set<string>> => {
  const active = new Set<string>();
  if (agentIds.length === 0) {
    return active;
  }

  try {
    signal.throwIfAborted();
    const { apiKey, isValid } = await getAPIKeyForSyntheticsService({ server });
    if (!apiKey || !isValid) {
      return active;
    }

    const esClient = server.coreStart.elasticsearch.client.asScoped(
      getFakeKibanaRequest({ id: apiKey.id, api_key: apiKey.apiKey })
    ).asCurrentUser;

    const result = await esClient.search<unknown, { agents: { buckets: Array<{ key: string }> } }>(
      {
        index: SYNTHETICS_INDEX_PATTERN,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        track_total_hits: false,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: now - windowMs, format: 'epoch_millis' } } },
              { terms: { 'agent.id': agentIds } },
            ],
          },
        },
        aggs: {
          agents: { terms: { field: 'agent.id', size: agentIds.length } },
        },
      },
      { signal }
    );

    for (const bucket of result.aggregations?.agents.buckets ?? []) {
      active.add(bucket.key);
    }
  } catch (e) {
    if (signal.aborted) {
      throw e;
    }
    server.logger.debug(
      `[RebalancePrivateLocationShardsTask] synthetics-* liveness query failed; ` +
        `falling back to check-in signal only: ${e.message}`
    );
  }

  return active;
};
