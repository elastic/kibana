/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import { apiTest } from '../../fixtures';
import {
  RULE_INTERVAL,
  createDetectionRuleWithUiam,
  deleteAlertsInSpace,
  deleteAllDetectionRulesInSpace,
  seedLogsEvent,
  waitForRuleAlertHosts,
} from '../../fixtures/cps_rule_helpers';

/**
 * Threat-match rule execution under CPS all-linked scope.
 *
 * Claim: with default-space NPRE `_alias:*`, origin events correlate with
 * indicators that exist only on the linked project.
 *
 * Does not cover: the reverse (linked events + origin indicators); field
 * autocomplete (see the CPS threat-match UI field-dropdown spec); space-scope
 * isolation (custom query spec).
 *
 * Wait for the scheduled run (1m minimum interval). Do not use rule preview —
 * preview is a different ES client mix. This test covers Task Manager + the
 * rule's UIAM key + `projectRouting: 'space'`.
 *
 * Requires:
 *   node scripts/scout start-server --arch serverless \
 *     --domain security_complete --serverConfigSet cps_local
 *
 * Run on Docker Desktop or Linux, not Colima.
 */

const seedIndicator = async (
  esClient: EsClient,
  { dataStream, hostName, runId }: { dataStream: string; hostName: string; runId: string }
): Promise<void> => {
  await esClient.indices.deleteDataStream({ name: dataStream }, { ignore: [404] });
  await esClient.bulk(
    {
      refresh: 'wait_for',
      operations: [
        { create: { _index: dataStream } },
        {
          '@timestamp': new Date(Date.now() - 5 * 60_000).toISOString(),
          event: { id: `${runId}-indicator-${hostName}`, kind: 'indicator' },
          host: { name: hostName },
        },
      ],
    },
    { requestTimeout: 180_000 }
  );
};

apiTest.describe('CPS threat match rule alerts', { tag: tags.serverless.security.complete }, () => {
  apiTest.setTimeout(240_000);

  const runId = randomUUID().slice(0, 8);
  const eventsIndex = `logs-scout-cps-tm-events-${runId}`;
  const threatIndex = `logs-scout-cps-tm-threat-${runId}`;
  const eventAction = `scout-cps-tm-${runId}`;
  const matchHostName = `scout-cps-tm-host-${runId}`;
  const ruleName = `CPS threat match ${runId}`;
  const ruleId = `cps-threat-match-${runId}`;

  let cookieHeader: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, esClient, linkedProject, samlAuth }) => {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionAlerts.deleteAll();

    const credentials = await samlAuth.asInteractiveUser('admin');
    cookieHeader = credentials.cookieHeader;

    await seedLogsEvent(esClient, {
      dataStream: eventsIndex,
      hostName: matchHostName,
      eventAction,
      runId,
    });
    await seedIndicator(linkedProject.esClient, {
      dataStream: threatIndex,
      hostName: matchHostName,
      runId,
    });
  });

  apiTest.afterAll(async ({ kbnClient, esClient, linkedProject }) => {
    await deleteAllDetectionRulesInSpace(kbnClient);
    await deleteAlertsInSpace(esClient);
    await esClient.indices.deleteDataStream({ name: eventsIndex }, { ignore: [404] });
    await esClient.indices.deleteDataStream({ name: threatIndex }, { ignore: [404] });
    await linkedProject.esClient.indices.deleteDataStream({ name: eventsIndex }, { ignore: [404] });
    await linkedProject.esClient.indices.deleteDataStream({ name: threatIndex }, { ignore: [404] });
  });

  apiTest(
    'correlates origin events with linked-project indicators',
    async ({ apiClient, esClient, kbnClient }) => {
      try {
        const createResponse = await createDetectionRuleWithUiam({
          apiClient,
          cookieHeader,
          body: {
            enabled: true,
            name: ruleName,
            description: 'CPS threat match origin events with linked indicators',
            risk_score: 1,
            rule_id: ruleId,
            severity: 'high',
            type: 'threat_match',
            language: 'kuery',
            index: [eventsIndex],
            query: `event.action: "${eventAction}"`,
            threat_index: [threatIndex],
            threat_query: 'event.kind: indicator',
            threat_mapping: [
              {
                entries: [
                  {
                    field: 'host.name',
                    value: 'host.name',
                    type: 'mapping',
                  },
                ],
              },
            ],
            interval: RULE_INTERVAL,
            from: 'now-1h',
          },
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toMatchObject({ rule_id: ruleId });

        const hostNames = await waitForRuleAlertHosts({
          esClient,
          ruleName,
          minCount: 1,
        });

        expect(
          hostNames,
          'Origin events must correlate with indicators that exist only on the linked project'
        ).toContain(matchHostName);
      } finally {
        await deleteAllDetectionRulesInSpace(kbnClient);
        await deleteAlertsInSpace(esClient);
      }
    }
  );
});
