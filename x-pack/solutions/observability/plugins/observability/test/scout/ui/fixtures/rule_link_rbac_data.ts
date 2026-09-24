/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { EsClient, ObltWorkerFixtures } from '@kbn/scout-oblt';

/**
 * Backing alerts-as-data index for the custom threshold rule type. Kibana
 * provisions this write alias at boot, so the documents can be indexed straight
 * into it (mirrors the approach in `alerts_data.ts` and the infra Scout alerts
 * fixture).
 */
export const THRESHOLD_ALERTS_INDEX = '.alerts-observability.threshold.alerts-default';

/**
 * Tag prefix applied to both the rules and the alert documents. Each `ingest`
 * call appends a unique suffix so cleanup only removes the data it created:
 * these specs run in parallel (`workers: 2`) against shared Elasticsearch, and a
 * single shared tag would let one spec file's `afterAll` `deleteByQuery` wipe the
 * other file's alerts mid-run.
 */
const RULE_LINK_RBAC_TAG_PREFIX = 'obs-rule-link-rbac-scout-test';

/**
 * Both alerts are custom threshold rules (`observability.rules.custom_threshold`),
 * a rule type that is registered in every observability deployment (stateful and
 * serverless) and that ships a custom alert details overview section.
 *
 * Custom threshold is a *shared* rule type registered under multiple features:
 * the `logs` feature authorizes it under the `logs` consumer and the
 * `infrastructure` feature under the `infrastructure` consumer. Rule read is
 * authorized per rule type *and consumer*, so a rule created with consumer
 * `logs` is readable only by a user with the `logs` feature, and one with
 * consumer `infrastructure` only by a user with the `infrastructure` feature.
 * The rule links must therefore appear for the rule the user can read and stay
 * hidden for the one it cannot.
 */
export const LOGS_RULE = {
  name: 'Scout Custom Threshold Rule (logs)',
  ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  consumer: 'logs',
  producer: 'observability',
  category: 'Custom threshold',
} as const;

export const METRICS_RULE = {
  name: 'Scout Custom Threshold Rule (infrastructure)',
  ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  consumer: 'infrastructure',
  producer: 'observability',
  category: 'Custom threshold',
} as const;

export interface RuleLinkRbacIngestResult {
  logsRuleId: string;
  metricsRuleId: string;
  /**
   * Unique tag applied to this ingest's rules and alert documents. Pass it back
   * to `cleanRuleLinkRbacAlerts` so cleanup only removes this ingest's data.
   */
  cleanupTag: string;
}

/**
 * Deterministic alert document id (and `kibana.alert.uuid`) derived from a rule
 * id, so tests can navigate straight to an alert's details page by id.
 */
export const alertIdForRule = (ruleId: string): string => `${ruleId}-alert`;

type RuleDefinition = typeof LOGS_RULE | typeof METRICS_RULE;

/**
 * Minimal-but-valid custom threshold params. The rules are created disabled, so
 * these are never executed; they exist so the created rule validates and so the
 * indexed alert's `kibana.alert.rule.parameters` has the `criteria` the custom
 * alert details overview section reads to render.
 */
const buildRuleParams = (index: string) => ({
  criteria: [
    {
      comparator: '>' as const,
      metrics: [{ name: 'A', aggType: 'count' as const }],
      threshold: [100],
      timeSize: 5,
      timeUnit: 'm' as const,
    },
  ],
  alertOnNoData: false,
  alertOnGroupDisappear: false,
  searchConfiguration: {
    query: { query: '', language: 'kuery' as const },
    index,
  },
});

const LOGS_RULE_PARAMS = buildRuleParams('logs-*');
const METRICS_RULE_PARAMS = buildRuleParams('metrics-*');

const buildAlertDoc = ({
  rule,
  ruleId,
  params,
  tag,
  timestamp,
}: {
  rule: RuleDefinition;
  ruleId: string;
  params: ReturnType<typeof buildRuleParams>;
  tag: string;
  timestamp: string;
}) => ({
  '@timestamp': timestamp,
  'event.action': 'active',
  'event.kind': 'signal',
  'kibana.alert.status': 'active',
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.duration.us': 1197194000,
  'kibana.alert.instance.id': '*',
  'kibana.alert.uuid': alertIdForRule(ruleId),
  'kibana.alert.reason': `${rule.name} is active`,
  'kibana.alert.rule.category': rule.category,
  'kibana.alert.rule.consumer': rule.consumer,
  'kibana.alert.rule.producer': rule.producer,
  'kibana.alert.rule.rule_type_id': rule.ruleTypeId,
  'kibana.alert.rule.name': rule.name,
  'kibana.alert.rule.uuid': ruleId,
  'kibana.alert.rule.parameters': params,
  // One evaluated value per criterion. The custom threshold alert details
  // section indexes into this array per criterion with a non-null assertion
  // (`alert.fields[ALERT_EVALUATION_VALUES]![index]`), so it must be present and
  // aligned with `params.criteria` or the section throws while rendering.
  'kibana.alert.evaluation.values': params.criteria.map(() => 150),
  'kibana.alert.start': timestamp,
  'kibana.alert.time_range': { gte: timestamp },
  'kibana.space_ids': ['default'],
  'kibana.version': '8.0.0',
  tags: [tag],
});

/**
 * Creates two (disabled) custom threshold rules — one with the `logs` consumer
 * and one with the `infrastructure` consumer — then indexes one active alert
 * document for each so the alerts table and flyout have data to render. The
 * rules are created disabled because the tests only rely on the documents
 * indexed here, not on rule execution.
 */
export const ingestRuleLinkRbacAlerts = async ({
  esClient,
  apiServices,
  timestamp,
}: {
  esClient: EsClient;
  apiServices: ObltWorkerFixtures['apiServices'];
  timestamp: string;
}): Promise<RuleLinkRbacIngestResult> => {
  const cleanupTag = `${RULE_LINK_RBAC_TAG_PREFIX}-${uuidv4()}`;

  const logsRule = await apiServices.alerting.rules.create({
    name: LOGS_RULE.name,
    ruleTypeId: LOGS_RULE.ruleTypeId,
    consumer: LOGS_RULE.consumer,
    enabled: false,
    schedule: { interval: '1m' },
    tags: [cleanupTag],
    params: LOGS_RULE_PARAMS,
  });

  const metricsRule = await apiServices.alerting.rules.create({
    name: METRICS_RULE.name,
    ruleTypeId: METRICS_RULE.ruleTypeId,
    consumer: METRICS_RULE.consumer,
    enabled: false,
    schedule: { interval: '1m' },
    tags: [cleanupTag],
    params: METRICS_RULE_PARAMS,
  });

  const logsRuleId = logsRule.data.id as string;
  const metricsRuleId = metricsRule.data.id as string;

  // Index with a deterministic `_id` matching the alert uuid. The alerts table
  // finds these alerts by a `kibana.alert.rule.uuid` field query, but the alert
  // *details* page fetches a single alert by its Elasticsearch `_id`
  // (`buildEsQueryWithAuthz` issues `_id:<id>`), so the document id must be known
  // and stable for `alertDetailsPage.goto(<alertId>)` to resolve it.
  const operations = [
    { create: { _index: THRESHOLD_ALERTS_INDEX, _id: alertIdForRule(logsRuleId) } },
    buildAlertDoc({
      rule: LOGS_RULE,
      ruleId: logsRuleId,
      params: LOGS_RULE_PARAMS,
      tag: cleanupTag,
      timestamp,
    }),
    { create: { _index: THRESHOLD_ALERTS_INDEX, _id: alertIdForRule(metricsRuleId) } },
    buildAlertDoc({
      rule: METRICS_RULE,
      ruleId: metricsRuleId,
      params: METRICS_RULE_PARAMS,
      tag: cleanupTag,
      timestamp,
    }),
  ];

  const bulkResponse = await esClient.bulk({ operations, refresh: 'wait_for' });
  if (bulkResponse.errors) {
    const failures = bulkResponse.items
      .filter((item) => item.create?.error)
      .map((item) => item.create!.error!.reason);
    throw new Error(`Failed to ingest rule-link RBAC alert documents: ${failures.join('; ')}`);
  }

  return { logsRuleId, metricsRuleId, cleanupTag };
};

export const cleanRuleLinkRbacAlerts = async ({
  esClient,
  apiServices,
  cleanupTag,
}: {
  esClient: EsClient;
  apiServices: ObltWorkerFixtures['apiServices'];
  cleanupTag: string;
}): Promise<void> => {
  await apiServices.alerting.cleanup.deleteRulesByTags([cleanupTag]);

  await esClient
    .deleteByQuery({
      index: '.alerts-observability.*',
      query: { term: { tags: cleanupTag } },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    })
    .catch(() => {});
};
