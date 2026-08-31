/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../../fixtures';
import {
  ISOLATION_SETTLE_MS,
  RULE_INTERVAL,
  createDetectionRuleWithUiam,
  deleteAlertsInSpace,
  deleteAllDetectionRulesInSpace,
  seedLogsEvent,
  waitForRuleAlertHosts,
} from '../../fixtures/cps_rule_helpers';

/**
 * Custom query rule execution under CPS space scope.
 *
 * Covers:
 * - Default space NPRE `_alias:*`: alerts from origin AND linked source events.
 * - Origin-only space (`_alias:_origin`): linked events must not alert.
 * - Linked-only space (`_alias:linked_local_project`): origin events must not alert.
 *
 * Three tests, three claims, three scheduled rule runs. Detection rules cannot
 * schedule faster than 1m, so this file is slow by design. Do not merge these
 * into one test: a failure must identify which space scope broke (all-linked,
 * origin-only, or linked-only).
 *
 * Do not replace the wait with rule preview. Preview uses a different ES client
 * mix (including asInternalUser, which is origin-only). These tests cover
 * scheduled execution: Task Manager, the rule's UIAM key, and projectRouting
 * space.
 *
 * Rule create must use a UIAM session (SAML cookie), not `requestAuth` API keys
 * or Scout `kbnClient`. `cps_local` sets `xpack.alerting.rules.apiKeyType=uiam`.
 * Alerting only grants a UIAM execution key when the create request carries UIAM
 * credentials (`essu_…`). API keys and `kbnClient` (basic auth) skip grant and
 * the rule runs with a stock ES API key that cannot fan out.
 *
 * Does not cover: saved query / EQL / ES|QL / ML / new terms; CPS Kibana flag
 * off; exceptions, filters, data views; alerts-table / signals search (pinned
 * origin, a different pipeline); rule preview.
 *
 * Requires:
 *   node scripts/scout start-server --arch serverless \
 *     --domain security_complete --serverConfigSet cps_local
 *
 * Run on Docker Desktop or Linux, not Colima. Docker needs ≥ ~12–16 GB RAM or
 * the linked ES node is OOM-killed (exit 137) and `localhost:9230` is unreachable.
 */

const SPACE_PROJECT_ROUTING_ORIGIN_ONLY = '_alias:_origin';
/**
 * Linked-only space NPRE. `_alias:linked_local_project` is the cps_local docker
 * alias from GET /_remote/info. `@kbn/mock-idp-utils` (`_id:…`) cannot be imported
 * from security_solution (group-crossing).
 */
const SPACE_PROJECT_ROUTING_LINKED_ONLY = '_alias:linked_local_project';

apiTest.describe('CPS custom query rule alerts', { tag: tags.serverless.security.complete }, () => {
  const runId = randomUUID().slice(0, 8);
  const sourceIndex = `logs-scout-cps-query-${runId}`;
  const eventAction = `scout-cps-custom-query-${runId}`;
  const originHostName = `scout-cps-origin-host-${runId}`;
  const linkedHostName = `scout-cps-linked-host-${runId}`;

  let cookieHeader: Record<string, string>;

  const customQueryBody = (name: string, ruleId: string) => ({
    ...CUSTOM_QUERY_RULE,
    name,
    rule_id: ruleId,
    query: `event.action: "${eventAction}"`,
    interval: RULE_INTERVAL,
    from: 'now-1h',
  });

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

  apiTest.afterAll(async ({ apiServices, esClient, linkedProject }) => {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionAlerts.deleteAll();
    await esClient.indices.deleteDataStream({ name: sourceIndex }, { ignore: [404] });
    await linkedProject.esClient.indices.deleteDataStream({ name: sourceIndex }, { ignore: [404] });
  });

  apiTest(
    'generates alerts from origin and linked projects when space scope is all linked',
    async ({ apiClient, esClient, kbnClient }) => {
      apiTest.setTimeout(240_000);
      const ruleName = `CPS custom query all-linked ${runId}`;
      const ruleId = `cps-custom-query-all-${runId}`;

      try {
        const createResponse = await createDetectionRuleWithUiam({
          apiClient,
          cookieHeader,
          body: customQueryBody(ruleName, ruleId),
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toMatchObject({ rule_id: ruleId });

        const hostNames = await waitForRuleAlertHosts({
          esClient,
          ruleName,
          minCount: 2,
        });

        expect(
          hostNames,
          'With space scope `_alias:*`, the rule must alert on matching events from origin and linked projects'
        ).toStrictEqual(expect.arrayContaining([originHostName, linkedHostName]));
      } finally {
        await deleteAllDetectionRulesInSpace(kbnClient);
        await deleteAlertsInSpace(esClient);
      }
    }
  );

  apiTest(
    'does not alert on linked-project events when space scope is origin only',
    async ({ apiClient, apiServices, esClient, kbnClient }) => {
      apiTest.setTimeout(240_000);
      const spaceId = `cps-cq-origin-${runId}`;
      const ruleName = `CPS custom query origin-only ${runId}`;
      const ruleId = `cps-custom-query-origin-${runId}`;

      await apiServices.spaces.create({
        id: spaceId,
        name: spaceId,
        projectRouting: SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
      });

      try {
        const createResponse = await createDetectionRuleWithUiam({
          apiClient,
          cookieHeader,
          body: customQueryBody(ruleName, ruleId),
          spaceId,
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toMatchObject({ rule_id: ruleId });

        const hostNames = await waitForRuleAlertHosts({
          esClient,
          ruleName,
          minCount: 1,
          spaceId,
          settleMs: ISOLATION_SETTLE_MS,
        });

        expect(
          hostNames,
          'With space scope `_alias:_origin`, a matching origin event must still alert'
        ).toContain(originHostName);
        expect(
          hostNames,
          'With space scope `_alias:_origin`, a matching linked-project event must not alert'
        ).not.toContain(linkedHostName);
      } finally {
        await deleteAllDetectionRulesInSpace(kbnClient, spaceId);
        await deleteAlertsInSpace(esClient, spaceId);
        await apiServices.spaces.delete(spaceId);
      }
    }
  );

  apiTest(
    'does not alert on origin events when space scope is the linked project only',
    async ({ apiClient, apiServices, esClient, kbnClient }) => {
      apiTest.setTimeout(240_000);
      const spaceId = `cps-cq-linked-${runId}`;
      const ruleName = `CPS custom query linked-only ${runId}`;
      const ruleId = `cps-custom-query-linked-${runId}`;

      await apiServices.spaces.create({
        id: spaceId,
        name: spaceId,
        projectRouting: SPACE_PROJECT_ROUTING_LINKED_ONLY,
      });

      try {
        const createResponse = await createDetectionRuleWithUiam({
          apiClient,
          cookieHeader,
          body: customQueryBody(ruleName, ruleId),
          spaceId,
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toMatchObject({ rule_id: ruleId });

        const hostNames = await waitForRuleAlertHosts({
          esClient,
          ruleName,
          minCount: 1,
          spaceId,
          settleMs: ISOLATION_SETTLE_MS,
        });

        expect(
          hostNames,
          'With linked-only space scope, a matching linked-project event must still alert'
        ).toContain(linkedHostName);
        expect(
          hostNames,
          'With linked-only space scope, a matching origin event must not alert'
        ).not.toContain(originHostName);
      } finally {
        await deleteAllDetectionRulesInSpace(kbnClient, spaceId);
        await deleteAlertsInSpace(esClient, spaceId);
        await apiServices.spaces.delete(spaceId);
      }
    }
  );
});
