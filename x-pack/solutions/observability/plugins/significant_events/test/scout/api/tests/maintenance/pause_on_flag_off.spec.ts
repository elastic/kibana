/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { ApiClientFixture, KbnClient } from '@kbn/scout-oblt';
import { ALERTING_V2_ENABLED_SETTING_ID } from '@kbn/alerting-v2-constants';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from '../../../../../common/maintenance/actors';
import { computeRuleId } from '../../../../../server/lib/knowledge_indicators/helpers/compute_rule_id';
import { NIGHTSHIFT_FLAG_SETTLE_MS } from '../../../../../server/lib/maintenance/when_nightshift_turns_off';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../fixtures/constants';

// A managed workflow installed as soon as Significant Events is available.
const WORKFLOW_ENDPOINT = 'api/workflows/workflow/system-significant-events-discovery';
// Serverless disables the public global settings API.
const ALERTING_V2_ENABLED_SETTING_PATH = `/internal/kibana/global_settings/${encodeURIComponent(
  ALERTING_V2_ENABLED_SETTING_ID
)}`;
const QUERY_STREAM = 'logs.otel';
// A filter-only MATCH query, so creating it also installs its backing rule.
const QUERY_ESQL = `FROM ${QUERY_STREAM}, ${QUERY_STREAM}.* | WHERE severity_text == "ERROR"`;
// The flag-off pause runs only after the flag value settles, plus, on Cloud, the ~10s config
// poll that carries the override to every node.
const POLL_OPTIONS = { timeout: 45_000, intervals: [1_000] };

const PAUSED_BY_FLAG = { state: 'paused', updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR };

// Alerting v2 defaults to on; the explicit write keeps its routes reachable if the default changes.
const enableAlertingV2 = async (kbnClient: KbnClient) => {
  await kbnClient.uiSettings.updateGlobal({ [ALERTING_V2_ENABLED_SETTING_ID]: true });
};

const unsetAlertingV2 = async (kbnClient: KbnClient) => {
  await kbnClient.request({
    description: `unset ${ALERTING_V2_ENABLED_SETTING_ID}`,
    path: ALERTING_V2_ENABLED_SETTING_PATH,
    method: 'DELETE',
  });
};

const createClient = (apiClient: ApiClientFixture, cookieHeader: Record<string, string>) => {
  const internalHeaders = { ...COMMON_API_HEADERS, ...cookieHeader };
  const publicHeaders = { ...PUBLIC_API_HEADERS, ...cookieHeader };

  return {
    async getMaintenance() {
      const response = await apiClient.get('internal/significant_events/maintenance/_status', {
        headers: internalHeaders,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return { state: response.body.state, updatedBy: response.body.updatedBy };
    },
    async isAvailable() {
      const response = await apiClient.get('internal/significant_events/availability', {
        headers: internalHeaders,
        responseType: 'json',
      });
      return response.body.available;
    },
    async isWorkflowEnabled() {
      const response = await apiClient.get(WORKFLOW_ENDPOINT, {
        headers: publicHeaders,
        responseType: 'json',
      });
      return response.statusCode === 200 ? response.body.enabled : undefined;
    },
    async isRuleEnabled(ruleId: string) {
      const response = await apiClient.get(`api/alerting/v2/rules/${ruleId}`, {
        headers: publicHeaders,
        responseType: 'json',
      });
      return response.statusCode === 200 ? response.body.enabled : undefined;
    },
    /** Stores a rule-backed query and returns the id of its backing rule. */
    async createRuleBackedQuery(queryId: string) {
      const response = await apiClient.put(`internal/significant_events/queries/${queryId}`, {
        headers: internalHeaders,
        body: {
          title: 'Nightshift flag-off rule',
          esql: { query: QUERY_ESQL },
          target_name: QUERY_STREAM,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return computeRuleId(QUERY_STREAM, queryId, QUERY_ESQL);
    },
    /** Deletes the query together with its backing rule. */
    async deleteQuery(queryId: string) {
      const response = await apiClient.post('internal/streams/queries/_bulk_delete', {
        headers: internalHeaders,
        body: { queryIds: [queryId] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.failed).toBe(0);
    },
  };
};

apiTest.describe(
  'Pause when Nightshift is turned off',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;
    let queryId: string | undefined;

    apiTest.beforeAll(async ({ samlAuth, apiServices, kbnClient }) => {
      ({ cookieHeader } = await samlAuth.asStreamsAdmin());
      await enableAlertingV2(kbnClient);
      // An earlier flag flip in this run may have left the deployment paused.
      await apiServices.significantEventsTest.resumeSignificantEvents();
    });

    apiTest.afterAll(async ({ apiServices, apiClient, kbnClient }) => {
      await apiServices.significantEventsTest.enableSignificantEvents();
      await apiServices.significantEventsTest.resumeSignificantEvents();
      if (queryId !== undefined) {
        await createClient(apiClient, cookieHeader).deleteQuery(queryId);
      }
      await unsetAlertingV2(kbnClient);
    });

    apiTest(
      'pauses when the flag is turned off and stays paused when it is turned back on',
      async ({ apiClient, apiServices }) => {
        // Waits for workflow installation plus the flag settle window, beyond the 60s default.
        apiTest.setTimeout(120_000);
        const client = createClient(apiClient, cookieHeader);
        const nightshift = apiServices.significantEventsTest;

        const ruleId = await apiTest.step(
          'starts running, with a workflow and a rule enabled',
          async () => {
            expect((await client.getMaintenance()).state).toBe('enabled');
            // Installation is asynchronous, so wait until the workflow is installed and running.
            await expect.poll(client.isWorkflowEnabled, POLL_OPTIONS).toBe(true);
            queryId = `flag-off-${uuidv4()}`;
            const id = await client.createRuleBackedQuery(queryId);
            expect(await client.isRuleEnabled(id)).toBe(true);
            return id;
          }
        );

        await apiTest.step('turning the flag off pauses, disabling both', async () => {
          // A flip only counts once the previous value has held for the settle window, and
          // global setup turned the flag on moments ago.
          await delay(NIGHTSHIFT_FLAG_SETTLE_MS + 1_000);
          await nightshift.disableSignificantEvents();
          // The status route stays reachable while the flag is off.
          await expect.poll(client.getMaintenance, POLL_OPTIONS).toStrictEqual(PAUSED_BY_FLAG);
          // The state reads `paused` as soon as the pause is claimed, before the sweep ends.
          await expect.poll(client.isWorkflowEnabled, POLL_OPTIONS).toBe(false);
          await expect.poll(() => client.isRuleEnabled(ruleId), POLL_OPTIONS).toBe(false);
        });

        await apiTest.step('turning the flag back on keeps it paused', async () => {
          await nightshift.enableSignificantEvents();
          await expect.poll(client.isAvailable, POLL_OPTIONS).toBe(true);
          expect(await client.getMaintenance()).toStrictEqual(PAUSED_BY_FLAG);
          expect(await client.isRuleEnabled(ruleId)).toBe(false);
        });
      }
    );
  }
);
