/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { tags } from '@kbn/scout-oblt';
import type { EsClient, KibanaRole, KbnClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import {
  KIS_ONBOARDING_IN_PROGRESS_STATUSES,
  type SignificantEventsWorkflowStatus,
} from '@kbn/significant-events-schema';
import { computeRuleId } from '../../../../../server/lib/knowledge_indicators/helpers/compute_rule_id';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS, PUBLIC_API_HEADERS } from '../../fixtures/constants';

const READ_OPERATIONS = ['find', 'get', 'bulk_get'];
const WRITE_OPERATIONS = [
  'create',
  'bulk_create',
  'update',
  'bulk_update',
  'delete',
  'bulk_delete',
];
const SOURCE_WRITE_TIMEOUT_MS = 120_000;
const RULE_ACCESS_TIMEOUT_MS = 180_000;
const LEASE_CONFLICT_MESSAGE =
  'Source knowledge is being updated; retry after the current write finishes';

const retrySourceWrite = async <
  Response extends { statusCode: number; body: { message?: string } }
>(
  write: () => Promise<Response>
): Promise<Response> => {
  const deadline = Date.now() + SOURCE_WRITE_TIMEOUT_MS;
  let response = await write();
  while (
    response.statusCode === 409 &&
    response.body.message === LEASE_CONFLICT_MESSAGE &&
    Date.now() < deadline
  ) {
    await delay(1_000);
    response = await write();
  }
  return response;
};

const getKibanaApplication = async (
  esClient: EsClient,
  apiKeyId: string,
  spaceId: string
): Promise<string> => {
  const { api_keys: apiKeys } = await esClient.security.getApiKey({ id: apiKeyId });
  const applications = apiKeys.flatMap(({ role_descriptors: descriptors }) =>
    Object.values(descriptors ?? {}).flatMap(({ applications: grants }) => grants ?? [])
  );
  const grant = applications.find(({ resources }) => resources.includes(`space:${spaceId}`));
  if (!grant) throw new Error('The role has no space-scoped Kibana application grant');
  return grant.application;
};

apiTest.describe(
  'Nightshift rule saved-object access',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const testId = randomUUID();
    const spaceA = `rule-access-a-${testId}`;
    const spaceB = `rule-access-b-${testId}`;
    const indexName = `logs-rule-access-${testId}`;
    const readerQueryId = `reader-${testId}`;
    const managerQueryId = `manager-${testId}`;
    const inSpace = (path: string) => `/s/${spaceA}/${path}`;
    let source: { id: string; slug: string; view_name: string } | undefined;

    const getSource = () => {
      if (!source) throw new Error('The rule-access source has not been created');
      return source;
    };
    const queryBody = (queryId: string) => ({
      title: `Rule saved-object access ${queryId}`,
      esql: { query: `FROM ${getSource().view_name} | WHERE severity_text == "${testId}"` },
      source_id: getSource().id,
    });
    const ruleIdFor = (queryId: string) =>
      computeRuleId(spaceA, getSource().id, queryId, queryBody(queryId).esql.query);
    const role = (privilege: 'read' | 'all'): KibanaRole => ({
      elasticsearch: {
        cluster: [],
        indices: [{ names: [indexName, getSource().view_name], privileges: ['read'] }],
      },
      kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: [privilege] }, spaces: [spaceA] }],
    });
    const getRule = (kbnClient: KbnClient, queryId: string) =>
      kbnClient.request<{ id: string; enabled: boolean }>({
        method: 'GET',
        path: inSpace(`api/alerting/v2/rules/${ruleIdFor(queryId)}`),
        headers: PUBLIC_API_HEADERS,
        ignoreErrors: [404],
      });
    const getQuery = async (kbnClient: KbnClient, queryId: string) => {
      const { data } = await kbnClient.request<{
        queries: Array<{ id: string; rule_backed: boolean }>;
      }>({
        method: 'GET',
        path: inSpace('internal/streams/_queries'),
        headers: COMMON_API_HEADERS,
        query: {
          from: new Date(Date.now() - 60_000).toISOString(),
          to: new Date().toISOString(),
          bucketSize: '1m',
          sourceIds: getSource().id,
          status: ['active', 'draft'],
        },
      });
      return data.queries.find(({ id }) => id === queryId);
    };

    apiTest.beforeAll(async ({ apiServices, kbnClient, esClient }) => {
      apiTest.setTimeout(RULE_ACCESS_TIMEOUT_MS);
      for (const id of [spaceA, spaceB]) {
        await apiServices.spaces.create({ id, name: id });
      }
      await esClient.index({
        index: indexName,
        refresh: true,
        document: { '@timestamp': new Date().toISOString(), severity_text: 'INFO' },
      });
      await apiServices.significantEventsTest.resumeSignificantEvents({ spaceId: spaceA });
      const created = await kbnClient.request<{ source: NonNullable<typeof source> }>({
        method: 'POST',
        path: inSpace('internal/nightshift/sources'),
        headers: COMMON_API_HEADERS,
        body: { title: `Rule access ${testId}`, esql: `FROM ${indexName}` },
      });
      source = created.data.source;

      // Finish reconciliation and cancel automatic onboarding before writing dedicated queries.
      const reconcile = await retrySourceWrite(async () => {
        const { status, data } = await kbnClient.request<{ message?: string }>({
          method: 'POST',
          path: inSpace(`internal/streams/${getSource().id}/_reconcile_source`),
          headers: COMMON_API_HEADERS,
          body: { sourceSlug: getSource().slug },
          ignoreErrors: [409],
        });
        return { statusCode: status, body: data };
      });
      expect(reconcile).toHaveStatusCode(200);
      await kbnClient.request({
        method: 'POST',
        path: inSpace(`internal/streams/${getSource().id}/onboarding/_execute`),
        headers: COMMON_API_HEADERS,
        body: { action: 'cancel' },
      });
      await expect
        .poll(
          async () => {
            const { data } = await kbnClient.request<{ status: SignificantEventsWorkflowStatus }>({
              method: 'GET',
              path: inSpace(`internal/streams/${getSource().id}/onboarding/_status`),
              headers: COMMON_API_HEADERS,
            });
            return KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(data.status);
          },
          { timeout: SOURCE_WRITE_TIMEOUT_MS, intervals: [1_000] }
        )
        .toBe(false);
      await kbnClient.request({
        method: 'PUT',
        path: inSpace(`internal/significant_events/queries/${readerQueryId}`),
        headers: COMMON_API_HEADERS,
        body: queryBody(readerQueryId),
      });
    });

    apiTest.afterAll(async ({ apiServices, kbnClient, esClient }) => {
      try {
        if (source) {
          const { data } = await kbnClient.request<{ failed: number }>({
            method: 'POST',
            path: inSpace('internal/streams/queries/_bulk_delete'),
            headers: COMMON_API_HEADERS,
            body: { queryIds: [readerQueryId, managerQueryId] },
          });
          expect(data.failed).toBe(0);
          await kbnClient.request({
            method: 'DELETE',
            path: inSpace(`internal/nightshift/sources/${source.id}`),
            headers: COMMON_API_HEADERS,
          });
        }
      } finally {
        for (const id of [spaceA, spaceB]) await apiServices.spaces.delete(id);
        await esClient.indices.delete({ index: indexName }, { ignore: [404] });
      }
    });

    for (const privilege of ['read', 'all'] as const) {
      apiTest(
        `grants ${privilege} rule access only in the assigned space`,
        async ({ requestAuth, esClient }) => {
          const { apiKey } = await requestAuth.getApiKeyForCustomRole(role(privilege));
          const scopedEsClient = esClient.child({
            headers: { authorization: `ApiKey ${apiKey.encoded}` },
          });
          const application = await getKibanaApplication(scopedEsClient, apiKey.id, spaceA);
          const readActions = READ_OPERATIONS.map(
            (operation) => `saved_object:alerting_rule/${operation}`
          );
          const writeActions = WRITE_OPERATIONS.map(
            (operation) => `saved_object:alerting_rule/${operation}`
          );
          for (const space of [spaceA, spaceB]) {
            const resource = `space:${space}`;
            const result = await scopedEsClient.security.hasPrivileges({
              application: [
                {
                  application,
                  resources: [resource],
                  privileges: [...readActions, ...writeActions],
                },
              ],
            });
            expect(result.application[application][resource]).toStrictEqual({
              ...Object.fromEntries(readActions.map((action) => [action, space === spaceA])),
              ...Object.fromEntries(
                writeActions.map((action) => [action, space === spaceA && privilege === 'all'])
              ),
            });
          }
        }
      );

      apiTest(
        `keeps Universal Alerting APIs and capabilities separate from Nightshift ${privilege}`,
        async ({ apiClient, requestAuth, samlAuth, kbnClient }) => {
          const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role(privilege));
          const path = inSpace(`api/alerting/v2/rules/${ruleIdFor(readerQueryId)}`);
          const headers = { ...PUBLIC_API_HEADERS, ...apiKeyHeader };
          expect(await apiClient.get(path, { headers })).toHaveStatusCode(403);
          expect(await apiClient.delete(path, { headers })).toHaveStatusCode(403);

          const { cookieHeader } = await samlAuth.asInteractiveUser(role(privilege));
          const capabilities = await apiClient.post(inSpace('api/core/capabilities'), {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { applications: ['nightshift', 'alerting_v2_rules'] },
          });
          expect(capabilities).toHaveStatusCode(200);
          expect(capabilities.body.nightshift).toMatchObject({
            show: true,
            manage: privilege === 'all',
          });
          expect(capabilities.body.alerting_v2_rules).toMatchObject({ read: false, all: false });
          expect((await getRule(kbnClient, readerQueryId)).status).toBe(200);
        }
      );
    }

    apiTest(
      'rejects reader mutations without changing the query or rule',
      async ({ apiClient, samlAuth, kbnClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(role('read'));
        for (const action of ['_promote', '_demote', '_bulk_delete']) {
          const response = await apiClient.post(inSpace(`internal/streams/queries/${action}`), {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: { queryIds: [readerQueryId] },
          });
          expect(response).toHaveStatusCode(403);
        }
        const rule = await getRule(kbnClient, readerQueryId);
        expect(rule.status).toBe(200);
        expect(rule.data).toMatchObject({ id: ruleIdFor(readerQueryId), enabled: true });
        expect(await getQuery(kbnClient, readerQueryId)).toMatchObject({
          id: readerQueryId,
          rule_backed: true,
        });
      }
    );

    apiTest(
      'lets Nightshift All create, demote, promote and delete a rule-backed query',
      async ({ apiClient, samlAuth, kbnClient }) => {
        apiTest.setTimeout(RULE_ACCESS_TIMEOUT_MS);
        const { cookieHeader } = await samlAuth.asInteractiveUser(role('all'));
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };
        const upsert = await retrySourceWrite(() =>
          apiClient.put(inSpace(`internal/significant_events/queries/${managerQueryId}`), {
            headers,
            body: queryBody(managerQueryId),
          })
        );
        expect(upsert).toHaveStatusCode(200);
        expect(upsert.body).toMatchObject({ acknowledged: true });
        expect((await getRule(kbnClient, managerQueryId)).status).toBe(200);

        const demote = await apiClient.post(inSpace('internal/streams/queries/_demote'), {
          headers,
          body: { queryIds: [managerQueryId] },
        });
        expect(demote).toHaveStatusCode(200);
        expect(demote.body).toMatchObject({ demoted: 1 });
        expect((await getRule(kbnClient, managerQueryId)).status).toBe(404);
        expect(await getQuery(kbnClient, managerQueryId)).toMatchObject({
          id: managerQueryId,
          rule_backed: false,
        });

        const promote = await apiClient.post(inSpace('internal/streams/queries/_promote'), {
          headers,
          body: { queryIds: [managerQueryId] },
        });
        expect(promote).toHaveStatusCode(200);
        expect(promote.body).toMatchObject({ promoted: 1 });
        expect((await getRule(kbnClient, managerQueryId)).status).toBe(200);
        expect(await getQuery(kbnClient, managerQueryId)).toMatchObject({
          id: managerQueryId,
          rule_backed: true,
        });

        const deleted = await apiClient.post(inSpace('internal/streams/queries/_bulk_delete'), {
          headers,
          body: { queryIds: [managerQueryId] },
        });
        expect(deleted).toHaveStatusCode(200);
        expect(deleted.body).toStrictEqual({ succeeded: 1, failed: 0, skipped: 0 });
        expect((await getRule(kbnClient, managerQueryId)).status).toBe(404);
        expect(await getQuery(kbnClient, managerQueryId)).toBeUndefined();
      }
    );
  }
);
