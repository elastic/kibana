/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../../fixtures';
import {
  RULE_INTERVAL,
  createDetectionRuleWithUiam,
  deleteAlertsInSpace,
  deleteAllDetectionRulesInSpace,
  seedLogsEvent,
  thresholdCountFromAlertHit,
  waitForRuleAlertHits,
} from '../../fixtures/cps_rule_helpers';

/**
 * Threshold rule execution under CPS all-linked scope.
 *
 * Claim: with default-space NPRE `_alias:*`, a threshold of 2 with one matching
 * event on origin and one on linked produces an alert (the aggregation spans
 * projects).
 *
 * Wait for the scheduled run (1m minimum interval). Do not use rule preview —
 * preview is a different ES client mix. This test covers Task Manager + the
 * rule's UIAM key + `projectRouting: 'space'`.
 *
 * Does not cover: origin-only / linked-only isolation (custom query spec);
 * query-rule per-document fan-out; signal-history / prior-alert leak; other
 * rule types.
 *
 * Requires:
 *   node scripts/scout start-server --arch serverless \
 *     --domain security_complete --serverConfigSet cps_local
 *
 * Run on Docker Desktop or Linux, not Colima.
 */

apiTest.describe('CPS threshold rule alerts', { tag: tags.serverless.security.complete }, () => {
  apiTest.setTimeout(240_000);

  const runId = randomUUID().slice(0, 8);
  const sourceIndex = `logs-scout-cps-threshold-${runId}`;
  const eventAction = `scout-cps-threshold-${runId}`;
  const originHostName = `scout-cps-threshold-origin-${runId}`;
  const linkedHostName = `scout-cps-threshold-linked-${runId}`;
  const ruleName = `CPS threshold ${runId}`;
  const ruleId = `cps-threshold-${runId}`;

  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, esClient, linkedProject, samlAuth }) => {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionAlerts.deleteAll();

    const credentials = await samlAuth.asInteractiveUser('admin');
    cookieHeader = credentials.cookieHeader;

    await seedLogsEvent(esClient, {
      dataStream: sourceIndex,
      hostName: originHostName,
      eventAction,
      runId,
    });
    await seedLogsEvent(linkedProject.esClient, {
      dataStream: sourceIndex,
      hostName: linkedHostName,
      eventAction,
      runId,
    });
  });

  apiTest.afterAll(async ({ kbnClient, esClient, linkedProject }) => {
    await deleteAllDetectionRulesInSpace(kbnClient);
    await deleteAlertsInSpace(esClient);
    await esClient.indices.deleteDataStream({ name: sourceIndex }, { ignore: [404] });
    await linkedProject.esClient.indices.deleteDataStream({ name: sourceIndex }, { ignore: [404] });
  });

  apiTest(
    'counts matching events across origin and linked projects',
    async ({ apiClient, esClient, kbnClient }) => {
      try {
        const createResponse = await createDetectionRuleWithUiam({
          apiClient,
          cookieHeader,
          body: {
            index: ['logs-*'],
            enabled: true,
            name: ruleName,
            description: 'CPS threshold across origin and linked',
            risk_score: 1,
            rule_id: ruleId,
            severity: 'high',
            type: 'threshold',
            language: 'kuery',
            query: `event.action: "${eventAction}"`,
            interval: RULE_INTERVAL,
            from: 'now-1h',
            threshold: {
              field: [],
              value: 2,
            },
          },
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toMatchObject({ rule_id: ruleId });

        const hits = await waitForRuleAlertHits({
          esClient,
          ruleName,
          minCount: 1,
        });
        expect(hits[0]).toBeDefined();

        expect(
          thresholdCountFromAlertHit(hits[0]),
          'With space scope `_alias:*`, one origin event and one linked event must meet threshold value 2'
        ).toBe(2);
      } finally {
        await deleteAllDetectionRulesInSpace(kbnClient);
        await deleteAlertsInSpace(esClient);
      }
    }
  );
});
