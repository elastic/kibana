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
  executeTool,
  seedFeature,
  seedRuleBackedQuery,
} from '../../fixtures/built_in_role_access';
import { deleteSignificantEvent, seedSignificantEvent } from '../../fixtures/rule_events';

// No Kibana privilege besides Nightshift `all`, Agent Builder `read` (for the tools) and Alerts
// `all`, and no index privilege besides reading the data the source queries. Closing or reopening
// an event is an Alerting v2 alert action that needs Alerts `all`, which Nightshift `all` lacks.
const NIGHTSHIFT_ALL_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logs*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        [NIGHTSHIFT_FEATURE_ID]: ['all'],
        agentBuilder: ['read'],
        // Close and reopen go through the Alerting v2 alert actions client, which authorizes the
        // caller against Alerts `all`. The Nightshift feature privilege does not grant it.
        alerting_v2_alerts: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

const NIGHTSHIFT_ALL_NO_ALERTS_ROLE: KibanaRole = {
  ...NIGHTSHIFT_ALL_ROLE,
  kibana: [
    {
      base: [],
      feature: { [NIGHTSHIFT_FEATURE_ID]: ['all'], agentBuilder: ['read'] },
      spaces: ['*'],
    },
  ],
};

// Changing sources needs `configure_nightshift` on top of manage, which only the "Manage engines"
// sub-feature grants. Base privileges exclude it, so only the built-in admin role has it.
const ROLES: ReadonlyArray<{
  name: string;
  label: string;
  role: string | KibanaRole;
  canChangeSources: boolean;
  canCloseEvents: boolean;
}> = [
  {
    name: 'editor',
    label: 'the built-in editor role',
    role: 'editor',
    canChangeSources: false,
    canCloseEvents: true,
  },
  {
    name: 'admin',
    label: 'the built-in admin role',
    role: 'admin',
    canChangeSources: true,
    canCloseEvents: true,
  },
  {
    name: 'nightshift-all',
    label: 'a role with only Nightshift all, Agent Builder read and Alerts all',
    role: NIGHTSHIFT_ALL_ROLE,
    canChangeSources: false,
    canCloseEvents: true,
  },
  {
    name: 'nightshift-all-no-alerts',
    label: 'a role with only Nightshift all and Agent Builder read',
    role: NIGHTSHIFT_ALL_NO_ALERTS_ROLE,
    canChangeSources: false,
    canCloseEvents: false,
  },
];

// These roles can do everything except changing Significant Events settings
// (covered in settings_role_access.spec.ts) and, unless `canChangeSources`, changing sources.
for (const { name, label, role, canChangeSources, canCloseEvents } of ROLES) {
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
        await seedSignificantEvent(esClient, eventId, { title: 'Built-in role access check' });
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

      if (canChangeSources) {
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
      } else {
        apiTest('refuses to create a source', async ({ apiClient }) => {
          const response = await apiClient.post(SOURCES_ENDPOINT, {
            headers,
            body: { title: `${name}-refused-${uuidv4()}`, esql: ACCESS_SOURCE_ESQL },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(403);
        });

        apiTest('refuses to create a source from Agent Builder', async ({ apiClient }) => {
          const title = `${name}-tool-refused-${uuidv4()}`;

          const response = await executeTool(apiClient, toolHeaders, SOURCE_CREATE_TOOL_ID, {
            title,
            esql: ACCESS_SOURCE_ESQL,
          });
          expect(response).toHaveStatusCode(400);

          const listed = await apiClient.get(
            `${SOURCES_ENDPOINT}?page=1&per_page=5&search=${encodeURIComponent(title)}`,
            { headers, responseType: 'json' }
          );
          expect(listed.body.sources).toStrictEqual([]);
        });
      }

      if (canCloseEvents) {
        apiTest('closes and reopens a significant event', async ({ apiClient }) => {
          // An operator's change is an Alerting v2 alert action. The route privilege is the only
          // gate: Alerting v2 writes `.alert-actions` and `.rule-events` as the internal user.
          const readEventStatuses = async () => {
            const response = await apiClient.get(`${EVENTS_ENDPOINT}?event_id=${eventId}`, {
              headers,
              responseType: 'json',
            });
            return {
              statusCode: response.statusCode,
              statuses: (response.body.hits ?? []).map(
                ({ event_id: id, status }: { event_id: string; status: string }) => ({ id, status })
              ),
            };
          };

          await expect
            .poll(readEventStatuses, POLL_OPTIONS)
            .toStrictEqual({ statusCode: 200, statuses: [{ id: eventId, status: 'active' }] });

          const closeResponse = await apiClient.post(`${EVENTS_ENDPOINT}/${eventId}/update`, {
            headers,
            body: { status: 'inactive', assessment_note: `Closed by ${name}` },
            responseType: 'json',
          });
          expect(closeResponse).toHaveStatusCode(200);
          expect(closeResponse.body).toStrictEqual({ updated: 1, ignored: 0, status: 'inactive' });
          await expect
            .poll(readEventStatuses, POLL_OPTIONS)
            .toStrictEqual({ statusCode: 200, statuses: [{ id: eventId, status: 'inactive' }] });

          const reopenResponse = await apiClient.post(`${EVENTS_ENDPOINT}/${eventId}/update`, {
            headers,
            body: { status: 'active', assessment_note: `Reopened by ${name}` },
            responseType: 'json',
          });
          expect(reopenResponse).toHaveStatusCode(200);
          expect(reopenResponse.body).toStrictEqual({ updated: 1, ignored: 0, status: 'active' });
          await expect
            .poll(readEventStatuses, POLL_OPTIONS)
            .toStrictEqual({ statusCode: 200, statuses: [{ id: eventId, status: 'active' }] });
        });
      } else {
        apiTest('refuses to close an event without Alerts all', async ({ apiClient }) => {
          const closeResponse = await apiClient.post(`${EVENTS_ENDPOINT}/${eventId}/update`, {
            headers,
            body: { status: 'inactive', assessment_note: `Closed by ${name}` },
            responseType: 'json',
          });
          expect(closeResponse).toHaveStatusCode(403);

          const response = await apiClient.get(`${EVENTS_ENDPOINT}?event_id=${eventId}`, {
            headers,
            responseType: 'json',
          });
          expect(response.body.hits.map(({ status }: { status: string }) => status)).toStrictEqual([
            'active',
          ]);
        });
      }

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

      if (canChangeSources) {
        apiTest(
          'creates, updates and deletes a source from Agent Builder',
          async ({ apiClient, kbnClient }) => {
            const title = `${name}-tool-source-${uuidv4()}`;

            const createResponse = await executeTool(
              apiClient,
              toolHeaders,
              SOURCE_CREATE_TOOL_ID,
              {
                title,
                esql: ACCESS_SOURCE_ESQL,
              }
            );
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
                      bool: {
                        filter: [{ term: { 'source.id': id } }, { term: { deleted: true } }],
                      },
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
    }
  );
}
