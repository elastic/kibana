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

// A shared managed workflow, installed as soon as Significant Events is available. Every space
// uses it, so the pause leaves it enabled.
const SHARED_WORKFLOW_ENDPOINT = 'api/workflows/workflow/system-significant-events-discovery';
// A per-space workflow, created on demand. The pause turns it off in the space.
const BOOTSTRAP_CLEANUP_ENDPOINT = 'internal/significant_events/maintenance/cleanup/_bootstrap';
const SPACE_WORKFLOW_ENDPOINT = 'api/workflows/workflow/system-significant-events-cleanup-default';
// Serverless disables the public global settings API.
const ALERTING_V2_ENABLED_SETTING_PATH = `/internal/kibana/global_settings/${encodeURIComponent(
  ALERTING_V2_ENABLED_SETTING_ID
)}`;
const SOURCE_ESQL = 'FROM logs.otel, logs.otel.*';
// The flag-off pause runs only after the flag value settles, plus, on Cloud, the ~10s config
// poll that carries the override to every node.
const POLL_OPTIONS = { timeout: 45_000, intervals: [1_000] };

const PAUSED_BY_FLAG = { state: 'paused', updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR };

// The default Scout server leaves alerting v2 off, and its routes answer 503 until it is on.
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

const isSpaceList = (value: unknown): value is Array<{ id: string }> =>
  Array.isArray(value) &&
  value.every((space) => typeof space === 'object' && space !== null && 'id' in space);

const toSpaceIds = (value: unknown): string[] =>
  isSpaceList(value) ? value.map(({ id }) => id) : [];

const hasMaintenanceState = (value: unknown): value is { state: string } =>
  typeof value === 'object' && value !== null && 'state' in value;

/** Ids of the spaces whose Significant Events activity is paused right now. */
const listPausedSpaceIds = async (kbnClient: KbnClient): Promise<Set<string>> => {
  const spaceIds = toSpaceIds(await kbnClient.spaces.list());
  const states = await Promise.all(
    spaceIds.map(async (id) => {
      const { data } = await kbnClient.request<unknown>({
        method: 'GET',
        path: `/s/${id}/internal/significant_events/maintenance/_status`,
        headers: COMMON_API_HEADERS,
        ignoreErrors: [403, 404],
      });
      return { id, state: hasMaintenanceState(data) ? data.state : undefined };
    })
  );
  return new Set(states.filter(({ state }) => state === 'paused').map(({ id }) => id));
};

const createClient = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  engineAdminCookieHeader: Record<string, string>
) => {
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
    async isWorkflowEnabled(endpoint: string) {
      const response = await apiClient.get(endpoint, {
        headers: publicHeaders,
        responseType: 'json',
      });
      return response.statusCode === 200 ? response.body.enabled : undefined;
    },
    async bootstrapSpaceWorkflow() {
      // Bootstrapping needs Manage engines, which the streams admin role does not include.
      const response = await apiClient.post(BOOTSTRAP_CLEANUP_ENDPOINT, {
        headers: { ...COMMON_API_HEADERS, ...engineAdminCookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
    },
    async isRuleEnabled(ruleId: string) {
      const response = await apiClient.get(`api/alerting/v2/rules/${ruleId}`, {
        headers: publicHeaders,
        responseType: 'json',
      });
      return response.statusCode === 200 ? response.body.enabled : undefined;
    },
    /** Creates the source the rule-backed query is stored under. */
    async createSource(title: string) {
      const response = await apiClient.post('internal/nightshift/sources', {
        headers: internalHeaders,
        body: { title, esql: SOURCE_ESQL },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return { id: response.body.source.id, viewName: response.body.source.view_name };
    },
    async deleteSource(sourceId: string) {
      const response = await apiClient.delete(`internal/nightshift/sources/${sourceId}`, {
        headers: internalHeaders,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
    },
    /** Stores a rule-backed query and returns the id of its backing rule. */
    async createRuleBackedQuery({
      queryId,
      source,
    }: {
      queryId: string;
      source: { id: string; viewName: string };
    }) {
      // A filter-only MATCH query, so creating it also installs its backing rule.
      const esql = `FROM ${source.viewName} | WHERE severity_text == "ERROR"`;
      // Creating the source only queues its reconciliation. While that run holds the source's
      // write lease the write answers 409 and asks to retry, so retry until the lease is free.
      await expect
        .poll(async () => {
          const response = await apiClient.put(`internal/significant_events/queries/${queryId}`, {
            headers: internalHeaders,
            body: {
              title: 'Nightshift flag-off rule',
              esql: { query: esql },
              source_id: source.id,
            },
            responseType: 'json',
          });
          return response.statusCode;
        }, POLL_OPTIONS)
        .toBe(200);
      return computeRuleId('default', source.id, queryId, esql);
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
    let engineAdminCookieHeader: Record<string, string>;
    let queryId: string | undefined;
    let sourceId: string | undefined;
    let spaceIdsPausedBeforeTest = new Set<string>();

    apiTest.beforeAll(async ({ samlAuth, apiServices, kbnClient }) => {
      ({ cookieHeader } = await samlAuth.asStreamsAdmin());
      ({ cookieHeader: engineAdminCookieHeader } = await samlAuth.asNightshiftEngineAdmin());
      await enableAlertingV2(kbnClient);
      // Flag-off pauses every space. Spaces that were already paused keep that state afterwards.
      spaceIdsPausedBeforeTest = await listPausedSpaceIds(kbnClient);
      // An earlier flag flip in this run may have left the deployment paused.
      await apiServices.significantEventsTest.resumeSignificantEvents();
    });

    apiTest.afterAll(async ({ apiServices, apiClient, kbnClient }) => {
      await apiServices.significantEventsTest.enableSignificantEvents();
      await apiServices.significantEventsTest.resumeSignificantEvents();
      // Flag-off pauses every space, and resume only reaches the space it is called in. Leave the
      // spaces that were already paused before the test as they were.
      const spaceIds = toSpaceIds(await kbnClient.spaces.list());
      await Promise.all(
        spaceIds
          .filter((id) => id !== 'default' && !spaceIdsPausedBeforeTest.has(id))
          .map((id) => apiServices.significantEventsTest.resumeSignificantEvents({ spaceId: id }))
      );
      if (queryId !== undefined) {
        await createClient(apiClient, cookieHeader, engineAdminCookieHeader).deleteQuery(queryId);
      }
      if (sourceId !== undefined) {
        await createClient(apiClient, cookieHeader, engineAdminCookieHeader).deleteSource(sourceId);
      }
      await unsetAlertingV2(kbnClient);
    });

    apiTest(
      'pauses when the flag is turned off and stays paused when it is turned back on',
      async ({ apiClient, apiServices }) => {
        // Waits for workflow installation plus the flag settle window, beyond the 60s default.
        apiTest.setTimeout(120_000);
        const client = createClient(apiClient, cookieHeader, engineAdminCookieHeader);
        const nightshift = apiServices.significantEventsTest;

        const ruleId = await apiTest.step(
          'starts running, with workflows and a rule enabled',
          async () => {
            expect((await client.getMaintenance()).state).toBe('enabled');
            // Installation is asynchronous, so wait until the shared workflow is installed and running.
            await expect
              .poll(() => client.isWorkflowEnabled(SHARED_WORKFLOW_ENDPOINT), POLL_OPTIONS)
              .toBe(true);
            // The per-space workflow only exists once something asks for it.
            await client.bootstrapSpaceWorkflow();
            await expect
              .poll(() => client.isWorkflowEnabled(SPACE_WORKFLOW_ENDPOINT), POLL_OPTIONS)
              .toBe(true);
            const source = await client.createSource(`flag-off-${uuidv4()}`);
            sourceId = source.id;
            queryId = `flag-off-${uuidv4()}`;
            const id = await client.createRuleBackedQuery({ queryId, source });
            expect(await client.isRuleEnabled(id)).toBe(true);
            return id;
          }
        );

        await apiTest.step(
          'turning the flag off pauses, disabling the space and its rule',
          async () => {
            // A flip only counts once the previous value has held for the settle window, and
            // global setup turned the flag on moments ago.
            await delay(NIGHTSHIFT_FLAG_SETTLE_MS + 1_000);
            await nightshift.disableSignificantEvents();
            // The status route stays reachable while the flag is off.
            await expect.poll(client.getMaintenance, POLL_OPTIONS).toStrictEqual(PAUSED_BY_FLAG);
            // The state reads `paused` as soon as the pause is claimed, before the sweep ends.
            await expect
              .poll(() => client.isWorkflowEnabled(SPACE_WORKFLOW_ENDPOINT), POLL_OPTIONS)
              .toBe(false);
            await expect.poll(() => client.isRuleEnabled(ruleId), POLL_OPTIONS).toBe(false);
            // The shared workflows belong to every space, so the pause does not turn them off.
            expect(await client.isWorkflowEnabled(SHARED_WORKFLOW_ENDPOINT)).toBe(true);
          }
        );

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
