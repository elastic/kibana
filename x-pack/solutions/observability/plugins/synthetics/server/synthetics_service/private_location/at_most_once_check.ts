/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { SYNTHETICS_INDEX_PATTERN } from '../../../common/constants';

/**
 * The one ES|QL capability this module needs, decoupled from the full
 * `ElasticsearchClient` (whose `esql` is the entire `Esql` class — not
 * mockable as a plain object) so both Kibana's client and a raw
 * `@elastic/elasticsearch` `Client` (used by the dev-script harness) satisfy
 * it structurally, and a test double can implement just `query`.
 */
export interface EsqlQueryClient {
  esql: {
    query(request: estypes.EsqlQueryRequest): Promise<estypes.EsqlQueryResponse>;
  };
}

/**
 * A monitor whose check results were written by more than one Fleet agent
 * within the queried window — a break of the at-most-once guarantee that
 * condition-based sharding (see {@link ../assign_by_condition}) is meant to
 * provide. Any row here is evidence of a duplicate run, not merely a stale
 * placement.
 */
export interface AtMostOnceViolation {
  monitorId: string;
  distinctAgents: number;
  agentIds: string[];
}

export interface AtMostOnceCheckWindow {
  /** ISO8601 inclusive lower bound. Defaults to one hour before `to`. */
  from?: string;
  /** ISO8601 inclusive upper bound. Defaults to now. */
  to?: string;
}

/**
 * At-most-once harness: an ES|QL query over `synthetics-*` grouping check
 * results by `monitor.id` and flagging any monitor seen from more than one
 * `agent.id` within the window. Zero rows back is the invariant; any row is
 * a real duplicate execution.
 *
 * The window should be scoped tightly around a steady-state period with no
 * deliberate rebalance in flight — a monitor legitimately moves to a new
 * `agent.id` across a failover/recovery, which this query cannot distinguish
 * from a true duplicate.
 */
export const findAtMostOnceViolations = async (
  esClient: EsqlQueryClient,
  window: AtMostOnceCheckWindow = {}
): Promise<AtMostOnceViolation[]> => {
  const to = window.to ?? new Date().toISOString();
  const from = window.from ?? new Date(Date.parse(to) - 60 * 60 * 1000).toISOString();

  const response = await esClient.esql.query({
    query: `
FROM ${SYNTHETICS_INDEX_PATTERN}
| WHERE @timestamp >= ?from AND @timestamp <= ?to
| STATS distinct_agents = COUNT_DISTINCT(agent.id), agent_ids = VALUES(agent.id) BY monitor.id
| WHERE distinct_agents > 1
| SORT distinct_agents DESC
`,
    params: [{ from }, { to }] as estypes.EsqlESQLParams,
  });

  return toViolations(response);
};

const toViolations = (
  response: Pick<estypes.EsqlQueryResponse, 'columns' | 'values'>
): AtMostOnceViolation[] => {
  const columnIndex = (name: string) =>
    response.columns.findIndex((column) => column.name === name);
  const monitorIdx = columnIndex('monitor.id');
  const distinctIdx = columnIndex('distinct_agents');
  const agentsIdx = columnIndex('agent_ids');

  if (monitorIdx === -1 || distinctIdx === -1 || agentsIdx === -1) {
    return [];
  }

  return response.values.map((row) => {
    const agentIdsValue = row[agentsIdx];
    return {
      monitorId: String(row[monitorIdx]),
      distinctAgents: Number(row[distinctIdx]),
      agentIds: (Array.isArray(agentIdsValue) ? agentIdsValue : [agentIdsValue]).map(String),
    };
  });
};
