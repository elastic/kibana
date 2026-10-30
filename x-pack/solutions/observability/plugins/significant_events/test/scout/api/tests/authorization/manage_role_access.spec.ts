/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { KibanaRole } from '@kbn/scout-oblt';
import { NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';
import {
  ACCESS_SOURCE_ESQL,
  BULK_DELETE_QUERIES_ENDPOINT,
  DETECTIONS_ENDPOINT,
  DISCOVERY_QUERIES_ENDPOINT,
  EVENTS_ENDPOINT,
  KI_FEATURE_CREATE_TOOL_ID,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
  MARK_SCANNED_ENDPOINT,
  POLL_OPTIONS,
  QUERIES_ENDPOINT,
  SOURCES_ENDPOINT,
  SOURCE_CREATE_TOOL_ID,
  SOURCE_DELETE_TOOL_ID,
  SOURCE_UPDATE_TOOL_ID,
  TOOL_API_HEADERS,
  TOOL_EXECUTE_ENDPOINT,
  buildDetection,
  buildFeature,
  buildRuleBackedQuery,
  createAccessSource,
  deleteAccessSource,
  deleteDetections,
  deleteFeature,
  deleteQuery,
  fenceAutomaticOnboarding,
  getFeaturesEndpoint,
  deleteSignificantEvent,
  executeTool,
  seedFeature,
  seedRuleBackedQuery,
  seedSignificantEvent,
} from '../../fixtures/built_in_role_access';

// No Kibana privilege besides Nightshift `all` and Agent Builder `read` (for the tools), and no
// index privilege besides reading the data the source queries. Anything else Significant Events
// needs, Alerting v2 included, has to come from the Nightshift feature privilege.
const NIGHTSHIFT_ALL_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logs*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { [NIGHTSHIFT_FEATURE_ID]: ['all'], agentBuilder: ['read'] },
      spaces: ['*'],
    },
  ],
};

const ROLES: ReadonlyArray<{ name: string; label: string; role: string | KibanaRole }> = [
  { name: 'editor', label: 'the built-in editor role', role: 'editor' },
  { name: 'admin', label: 'the built-in admin role', role: 'admin' },
  {
    name: 'nightshift-all',
    label: 'a role with only Nightshift all and Agent Builder read',
    role: NIGHTSHIFT_ALL_ROLE,
  },
];

// These roles can do everything except changing Significant Events settings
// (covered in settings_role_access.spec.ts).
for (const { name, label, role } of ROLES) {
  apiTest.describe(
    `Significant Events actions for ${label}`,
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    () => {
      const eventId = `${name}-access-${uuidv4()}`;
      const ruleUuid = `${name}-access-${uuidv4()}`;
      const featureId = `${name}-access-${uuidv4()}`;
      const toolFeatureId = `${name}-tool-access-${uuidv4()}`;
      const queryId = `${name}-access-${uuidv4()}`;
      const seededQueryId = `${name}-seeded-access-${uuidv4()}`;
      let sourceId: string;
      let sourceSlug: string;
      let sourceViewName: string;
      let createdSourceId: string | undefined;
      let headers: Record<string, string>;
      let toolHeaders: Record<string, string>;

      apiTest.beforeAll(async ({ apiServices, esClient, kbnClient, samlAuth }) => {
        // Detection writes are rejected while Significant Events is paused.
        await apiServices.significantEventsTest.resumeSignificantEvents();
        await seedSignificantEvent(esClient, eventId);
        ({
          id: sourceId,
          slug: sourceSlug,
          viewName: sourceViewName,
        } = await createAccessSource({
          kbnClient,
          title: `${name}-access-${uuidv4()}`,
        }));
        const { cookieHeader } = await samlAuth.asInteractiveUser(role);
        headers = { ...COMMON_API_HEADERS, ...cookieHeader };
        toolHeaders = { ...TOOL_API_HEADERS, ...cookieHeader };
      });

      apiTest.afterAll(async ({ esClient, kbnClient }) => {
        await deleteSignificantEvent(esClient, eventId);
        await deleteDetections(esClient, ruleUuid);
        await deleteFeature({ kbnClient, sourceId, featureId });
        await deleteFeature({ kbnClient, sourceId, featureId: toolFeatureId });
        await deleteQuery({ kbnClient, queryId });
        await deleteQuery({ kbnClient, queryId: seededQueryId });
        await deleteAccessSource({ kbnClient, sourceId });
        if (createdSourceId) {
          await deleteAccessSource({ kbnClient, sourceId: createdSourceId });
        }
      });

      apiTest('creates and deletes a source', async ({ apiClient, kbnClient }) => {
        const createResponse = await apiClient.post(SOURCES_ENDPOINT, {
          headers,
          body: { title: `${name}-created-${uuidv4()}`, esql: ACCESS_SOURCE_ESQL },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const { id, slug } = createResponse.body.source;
        createdSourceId = id;
        await fenceAutomaticOnboarding({ kbnClient, source: { id, slug } });

        const deleteResponse = await apiClient.delete(`${SOURCES_ENDPOINT}/${id}`, {
          headers,
          responseType: 'json',
        });
        expect(deleteResponse).toHaveStatusCode(200);
      });

      apiTest('closes a significant event', async ({ apiClient }) => {
        await expect
          .poll(async () => {
            const response = await apiClient.get(`${EVENTS_ENDPOINT}?event_id=${eventId}`, {
              headers,
              responseType: 'json',
            });
            return {
              statusCode: response.statusCode,
              eventIds: (response.body.hits ?? []).map(
                ({ event_id: id }: { event_id: string }) => id
              ),
            };
          }, POLL_OPTIONS)
          .toStrictEqual({ statusCode: 200, eventIds: [eventId] });

        const response = await apiClient.post(`${EVENTS_ENDPOINT}/${eventId}/update`, {
          headers,
          body: { status: 'inactive', assessment_note: `Closed by ${name}` },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
      });

      apiTest('writes and reads detections', async ({ apiClient }) => {
        const createResponse = await apiClient.post(DETECTIONS_ENDPOINT, {
          headers,
          body: { detections: [buildDetection(ruleUuid, sourceId)] },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toStrictEqual({ count: 1 });

        const markScannedResponse = await apiClient.post(MARK_SCANNED_ENDPOINT, {
          headers,
          body: { rule_uuids: [ruleUuid], scanned_by: name },
          responseType: 'json',
        });
        expect(markScannedResponse).toHaveStatusCode(200);

        await expect
          .poll(async () => {
            const response = await apiClient.get(`${DETECTIONS_ENDPOINT}?rule_uuid=${ruleUuid}`, {
              headers,
              responseType: 'json',
            });
            return {
              statusCode: response.statusCode,
              ruleUuids: (response.body.hits ?? []).map(
                ({ rule_uuid: uuid }: { rule_uuid: string }) => uuid
              ),
            };
          }, POLL_OPTIONS)
          .toStrictEqual({ statusCode: 200, ruleUuids: [ruleUuid] });
      });

      apiTest('creates, lists and deletes a feature knowledge indicator', async ({ apiClient }) => {
        const createResponse = await apiClient.post(getFeaturesEndpoint(sourceId), {
          headers,
          body: buildFeature(featureId),
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toStrictEqual({ acknowledged: true });

        const listResponse = await apiClient.get(getFeaturesEndpoint(sourceId), {
          headers,
          responseType: 'json',
        });
        expect(listResponse).toHaveStatusCode(200);
        expect(listResponse.body.features).toStrictEqual(
          expect.arrayContaining([expect.objectContaining({ id: featureId, source_id: sourceId })])
        );

        const deleteResponse = await apiClient.delete(
          `${getFeaturesEndpoint(sourceId)}/${featureId}`,
          { headers, responseType: 'json' }
        );
        expect(deleteResponse).toHaveStatusCode(200);
      });

      apiTest(
        'creates and lists a rule-backed query knowledge indicator',
        async ({ apiClient }) => {
          const createResponse = await apiClient.put(`${QUERIES_ENDPOINT}/${queryId}`, {
            headers,
            body: buildRuleBackedQuery({ sourceId, viewName: sourceViewName }),
            responseType: 'json',
          });
          expect(createResponse).toHaveStatusCode(200);

          const now = Date.now();
          const listParams = new URLSearchParams({
            from: new Date(now - 60 * 60 * 1000).toISOString(),
            to: new Date(now).toISOString(),
            bucketSize: '1h',
            sourceIds: sourceId,
          });
          await expect
            .poll(async () => {
              const response = await apiClient.get(`${DISCOVERY_QUERIES_ENDPOINT}?${listParams}`, {
                headers,
                responseType: 'json',
              });
              return {
                statusCode: response.statusCode,
                queries: (response.body.queries ?? []).map(
                  ({ id, rule_backed: ruleBacked }: { id: string; rule_backed: boolean }) => ({
                    id,
                    ruleBacked,
                  })
                ),
              };
            }, POLL_OPTIONS)
            .toStrictEqual({ statusCode: 200, queries: [{ id: queryId, ruleBacked: true }] });
        }
      );

      // Seeded by the admin so deleting is checked even when this role cannot create the rule.
      apiTest(
        'deletes a rule-backed query knowledge indicator',
        async ({ apiClient, kbnClient }) => {
          await seedRuleBackedQuery({
            kbnClient,
            queryId: seededQueryId,
            sourceId,
            viewName: sourceViewName,
          });

          const deleteResponse = await apiClient.post(BULK_DELETE_QUERIES_ENDPOINT, {
            headers,
            body: { queryIds: [seededQueryId] },
            responseType: 'json',
          });
          expect(deleteResponse).toHaveStatusCode(200);
          expect(deleteResponse.body).toStrictEqual({ succeeded: 1, failed: 0, skipped: 0 });
        }
      );

      apiTest('creates a knowledge indicator from Agent Builder', async ({ apiClient }) => {
        const response = await apiClient.post(TOOL_EXECUTE_ENDPOINT, {
          headers: toolHeaders,
          body: {
            tool_id: KI_FEATURE_CREATE_TOOL_ID,
            tool_params: { ...buildFeature(toolFeatureId), slug: sourceSlug },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.results).toStrictEqual([
          expect.objectContaining({
            type: 'other',
            data: expect.objectContaining({
              slug: sourceSlug,
              acknowledged: true,
              feature: { id: toolFeatureId },
            }),
          }),
        ]);
      });

      apiTest(
        'creates, updates and deletes a source from Agent Builder',
        async ({ apiClient, kbnClient }) => {
          const title = `${name}-tool-source-${uuidv4()}`;

          const createResponse = await executeTool(apiClient, toolHeaders, SOURCE_CREATE_TOOL_ID, {
            title,
            esql: ACCESS_SOURCE_ESQL,
          });
          // Read before any assertion, so the source is removed even when one fails.
          const createdId: string | undefined = createResponse.body.results?.[0]?.data?.id;
          try {
            expect(createResponse).toHaveStatusCode(200);
            const created = createResponse.body.results[0];
            expect(created).toStrictEqual(
              expect.objectContaining({
                type: 'other',
                data: expect.objectContaining({ title, enabled: true }),
              })
            );
            const { id, slug } = created.data;
            const updatedTitle = `${title}-renamed`;
            const updateResponse = await executeTool(
              apiClient,
              toolHeaders,
              SOURCE_UPDATE_TOOL_ID,
              {
                source: slug,
                title: updatedTitle,
                enabled: false,
              }
            );
            expect(updateResponse).toHaveStatusCode(200);
            expect(updateResponse.body.results[0].data).toStrictEqual(
              expect.objectContaining({
                id,
                slug,
                title: updatedTitle,
                esql: ACCESS_SOURCE_ESQL,
                enabled: false,
              })
            );

            const deleteResponse = await executeTool(
              apiClient,
              toolHeaders,
              SOURCE_DELETE_TOOL_ID,
              {
                source: slug,
              }
            );
            expect(deleteResponse).toHaveStatusCode(200);
            expect(deleteResponse.body.results[0].data).toStrictEqual(
              expect.objectContaining({ deleted: true, id })
            );

            const getResponse = await apiClient.get(`${SOURCES_ENDPOINT}/${id}`, {
              headers,
              responseType: 'json',
            });
            expect(getResponse).toHaveStatusCode(404);
          } finally {
            if (createdId) {
              await deleteAccessSource({ kbnClient, sourceId: createdId });
            }
          }
        }
      );

      apiTest(
        'cleans up the knowledge indicators of a source deleted from Agent Builder',
        async ({ apiClient, esClient, kbnClient }) => {
          const { id, slug } = await createAccessSource({
            kbnClient,
            title: `${name}-delete-cascade-${uuidv4()}`,
          });
          try {
            await seedFeature({
              kbnClient,
              sourceId: id,
              featureId: `${name}-cascade-${uuidv4()}`,
            });

            const response = await executeTool(apiClient, toolHeaders, SOURCE_DELETE_TOOL_ID, {
              source: slug,
            });
            expect(response).toHaveStatusCode(200);
            expect(response.body.results[0].data).toStrictEqual(
              expect.objectContaining({ deleted: true, id })
            );

            await expect
              .poll(async () => {
                const { hits } = await esClient.search({
                  index: KNOWLEDGE_INDICATORS_DATA_STREAM,
                  size: 0,
                  track_total_hits: true,
                  query: {
                    bool: { filter: [{ term: { 'source.id': id } }, { term: { deleted: true } }] },
                  },
                });
                return typeof hits.total === 'number' ? hits.total : hits.total?.value;
              }, POLL_OPTIONS)
              .toBeGreaterThan(0);
          } finally {
            await deleteAccessSource({ kbnClient, sourceId: id });
          }
        }
      );
    }
  );
}
