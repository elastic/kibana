/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EsClient } from '@kbn/scout-security';
import { createDetectionsApi } from '@kbn/security-solution-test-api-clients/scout';
import { pollFor } from '../helpers';
import { expectStatus, type RuleTuningSpaceArgs } from './common';

/** The worker's default minimum is 10 false positives at a 50% rate. */
export const FP_ALERT_COUNT = 10;
/** The process of the false positives. The true positives run another one. */
export const FP_PROCESS_NAME = 'nginx';
const TP_PROCESS_NAME = 'ncat';
export const TP_EVENT_COUNT = 2;
export const SEEDED_EVENT_COUNT = FP_ALERT_COUNT + TP_EVENT_COUNT;
/**
 * How long before the test the seeded history happened. The rule looks back 6 minutes, so its
 * own runs never alert on these events. The backtest still replays them, because
 * `rule_tuning_review.yaml` ends it at the newest false positive (`run_previews`,
 * `timeframeEnd: inputs.last_fp_at`). If the review ends the backtest anywhere else, the
 * backtest counts in the tests drop to 0.
 */
const HISTORY_AGE_MS = 2 * 60 * 60_000;
const HISTORY_SPACING_MS = 20_000;

export interface SeededRule {
  /** Saved-object id. The review reads the rule by it. */
  id: string;
  ruleId: string;
  /** The rule's revision before the review. */
  revision: number;
  /** The data stream that holds the rule's source events. */
  eventsIndex: string;
}

/** The rule id of the rule seeded under `name`. Known before seeding, so cleanup can use it. */
export const reviewRuleId = (name: string): string => `${name}-rule`;

/**
 * The data stream with the source events of the rule seeded under `name`. It matches the
 * `logs-*-*` template, so ES creates a data stream with ECS mappings, and the worker's role can
 * read `logs-*`.
 */
export const reviewEventsIndex = (name: string): string => `logs-${name}-events`;

/** Creates a query rule with closed false positives and the source events behind them. */
export const seedRuleWithFalsePositives = async ({
  apiClient,
  headers,
  spaceId,
  esClient,
  name,
  query,
}: RuleTuningSpaceArgs & {
  esClient: EsClient;
  name: string;
  query: string;
}): Promise<SeededRule> => {
  const ruleId = reviewRuleId(name);
  const eventsIndex = reviewEventsIndex(name);
  const created = await createDetectionsApi(apiClient).createRule(
    {
      body: {
        rule_id: ruleId,
        name,
        description: `Scout rule tuning review rule ${name}.`,
        type: 'query',
        language: 'kuery',
        query,
        index: [eventsIndex],
        severity: 'medium',
        risk_score: 40,
        interval: '5m',
        from: 'now-6m',
        enabled: true,
      },
    },
    { headers, kibanaSpace: spaceId }
  );
  expectStatus(`Create rule ${name}`, created);
  // The alerts are written only after the rule's first run has installed the space's alerts
  // alias. A write to that name before the install makes ES create a plain, dynamically mapped
  // index, and the sweep's query then fails on fields that index never mapped.
  await pollFor(
    `the alerts alias of space ${spaceId}`,
    async () =>
      (await esClient.indices.existsAlias({ name: `.alerts-security.alerts-${spaceId}` }))
        ? true
        : undefined,
    { timeoutMs: 120_000, intervalMs: 1_000 }
  );
  const { id, revision } = created.body;

  // FP_ALERT_COUNT events of FP_PROCESS_NAME, each with a closed false positive alert below, and
  // TP_EVENT_COUNT events of TP_PROCESS_NAME with no alerts, which a good change keeps alerting
  // on. Every event sits a few seconds before its alert, and all of them inside one rule interval
  // before the newest false positive, so the backtest's last run covers each event once.
  const newestAlertAt = Date.now() - HISTORY_AGE_MS;
  const eventAt = (i: number): string =>
    new Date(newestAlertAt - i * HISTORY_SPACING_MS - 5_000).toISOString();
  const events = Array.from({ length: SEEDED_EVENT_COUNT }, (_, i) => {
    const isFalsePositive = i < FP_ALERT_COUNT;
    return [
      { create: {} },
      {
        '@timestamp': eventAt(i),
        'event.kind': 'event',
        'event.category': ['process'],
        'event.type': ['start'],
        'host.name': isFalsePositive ? `web-${i}` : `db-${i}`,
        'user.name': `svc_${i}`,
        'process.name': isFalsePositive ? FP_PROCESS_NAME : TP_PROCESS_NAME,
      },
    ];
  }).flat();
  const eventsBulk = await esClient.bulk({
    index: eventsIndex,
    refresh: 'wait_for',
    operations: events,
  });
  if (eventsBulk.errors) {
    const failed = eventsBulk.items.filter((item) => item.create?.error).slice(0, 3);
    throw new Error(`Seeding the source events failed: ${JSON.stringify(failed)}`);
  }

  const operations = Array.from({ length: FP_ALERT_COUNT }, (_, i) => {
    const uuid = randomUUID();
    const timestamp = new Date(newestAlertAt - i * HISTORY_SPACING_MS).toISOString();
    return [
      { create: { _id: uuid } },
      {
        '@timestamp': timestamp,
        'event.kind': 'signal',
        'kibana.space_ids': [spaceId],
        'kibana.alert.uuid': uuid,
        'kibana.alert.start': timestamp,
        'kibana.alert.rule.uuid': id,
        'kibana.alert.rule.rule_id': ruleId,
        'kibana.alert.rule.name': name,
        'kibana.alert.rule.revision': revision,
        'kibana.alert.rule.rule_type_id': 'siem.queryRule',
        'kibana.alert.rule.consumer': 'siem',
        'kibana.alert.rule.producer': 'siem',
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'closed',
        'kibana.alert.workflow_reason': 'false_positive',
        'kibana.alert.workflow_tags': [],
        'kibana.alert.severity': 'medium',
        'kibana.alert.risk_score': 40,
        'host.name': `web-${i}`,
        'user.name': `svc_${i}`,
        'process.name': FP_PROCESS_NAME,
      },
    ];
  }).flat();
  const bulk = await esClient.bulk({
    index: `.alerts-security.alerts-${spaceId}`,
    refresh: 'wait_for',
    operations,
  });
  if (bulk.errors) {
    const failed = bulk.items.filter((item) => item.create?.error).slice(0, 3);
    throw new Error(`Seeding the false positives failed: ${JSON.stringify(failed)}`);
  }
  return { id, ruleId, revision, eventsIndex };
};
