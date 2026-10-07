/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { ALERTS_RAG_DATASET_INVARIANTS, verifyAlertsRagSnapshot } from './snapshot_invariants';

interface AggResponseOverrides {
  totalOpenAlerts?: number;
  severities?: string[];
  distinctHosts?: number;
  openAlertsWithUserName?: number;
  openAlertsWithRuleName?: number;
}

const buildAggResponse = (overrides: AggResponseOverrides = {}) => {
  const inv = ALERTS_RAG_DATASET_INVARIANTS;
  const {
    totalOpenAlerts = inv.minOpenAlerts + 5,
    severities = ['critical', 'medium'],
    distinctHosts = inv.minDistinctHosts + 1,
    openAlertsWithUserName = inv.minOpenAlertsWithUserName + 1,
    openAlertsWithRuleName = inv.minOpenAlertsWithRuleName + 1,
  } = overrides;

  return {
    hits: { total: { value: totalOpenAlerts } },
    aggregations: {
      severities: {
        buckets: severities.map((key) => ({ key, doc_count: 1 })),
      },
      distinct_hosts: { value: distinctHosts },
      with_user_name: { doc_count: openAlertsWithUserName },
      with_rule_name: { doc_count: openAlertsWithRuleName },
    },
  };
};

const createMocks = (overrides: AggResponseOverrides = {}) => {
  const esClient = {
    search: jest.fn().mockResolvedValue(buildAggResponse(overrides)),
  } as unknown as Client;

  const log = {
    info: jest.fn(),
    warning: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as ToolingLog;

  return { esClient, log };
};

describe('verifyAlertsRagSnapshot', () => {
  it('passes silently when every invariant is satisfied', async () => {
    const { esClient, log } = createMocks();
    await expect(verifyAlertsRagSnapshot({ esClient, log })).resolves.toBeUndefined();
    // Single ES round-trip; the verifier should not need follow-up queries.
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('snapshot invariants OK'));
  });

  it('rejects when too few open alerts exist', async () => {
    const { esClient, log } = createMocks({
      totalOpenAlerts: ALERTS_RAG_DATASET_INVARIANTS.minOpenAlerts - 1,
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /expected ≥\d+ open alerts/
    );
  });

  it('rejects when no critical or high severity alert exists', async () => {
    const { esClient, log } = createMocks({ severities: ['low', 'medium'] });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /severity in \[critical, high\]/
    );
  });

  it('accepts when only `high` severity is present (alternate of `critical`)', async () => {
    // Either critical OR high satisfies example 1's "prioritise critical then
    // high" reference answer; only requiring both would over-constrain the
    // snapshot. Locking this here so the invariant logic doesn't drift into
    // an AND.
    const { esClient, log } = createMocks({ severities: ['high', 'low'] });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).resolves.toBeUndefined();
  });

  it('rejects when there are fewer than the required distinct hosts', async () => {
    const { esClient, log } = createMocks({
      distinctHosts: ALERTS_RAG_DATASET_INVARIANTS.minDistinctHosts - 1,
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /distinct host\.name across open alerts/
    );
  });

  it('rejects when no open alert has a populated user.name', async () => {
    const { esClient, log } = createMocks({ openAlertsWithUserName: 0 });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /open alert\(s\) with user\.name populated/
    );
  });

  it('rejects when no open alert has a populated kibana.alert.rule.name', async () => {
    const { esClient, log } = createMocks({ openAlertsWithRuleName: 0 });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /kibana\.alert\.rule\.name/
    );
  });

  it('reports every violation in a single error so CI logs show all drift at once', async () => {
    // The verifier's value is "one CI log scan finds every problem", not
    // "fix one at a time and re-run". Lock that contract with a fixture that
    // breaks multiple invariants simultaneously.
    const { esClient, log } = createMocks({
      totalOpenAlerts: 0,
      severities: [],
      distinctHosts: 0,
      openAlertsWithUserName: 0,
      openAlertsWithRuleName: 0,
    });
    await expect(verifyAlertsRagSnapshot({ esClient, log })).rejects.toThrow(
      /Violations:[\s\S]+1\.[\s\S]+2\.[\s\S]+3\.[\s\S]+4\.[\s\S]+5\./
    );
  });

  it('queries the correct alert index pattern filtered to open alerts', async () => {
    // The dataset says "open alerts" explicitly; running the invariant check
    // against all alerts (including closed/acknowledged) would let drift slip
    // through. Locking the query shape so a future "simplification" can't
    // silently drop the filter.
    const { esClient, log } = createMocks();
    await verifyAlertsRagSnapshot({ esClient, log });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.internal.alerts-security.alerts-default-*',
        query: { term: { 'kibana.alert.workflow_status': 'open' } },
      })
    );
  });
});
