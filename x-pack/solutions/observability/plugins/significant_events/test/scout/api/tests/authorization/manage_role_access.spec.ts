/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';
import {
  DETECTIONS_ENDPOINT,
  EVENTS_ENDPOINT,
  KI_FEATURE_CREATE_TOOL_ID,
  MARK_SCANNED_ENDPOINT,
  POLL_OPTIONS,
  TOOL_API_HEADERS,
  TOOL_EXECUTE_ENDPOINT,
  buildDetection,
  buildFeature,
  createAccessSource,
  deleteAccessSource,
  deleteDetections,
  deleteFeature,
  getFeaturesEndpoint,
  deleteSignificantEvent,
  seedSignificantEvent,
} from '../../fixtures/built_in_role_access';

// Editors and admins can do everything except changing Significant Events settings
// (covered in settings_role_access.spec.ts).
for (const role of ['editor', 'admin'] as const) {
  apiTest.describe(
    `Significant Events actions for the built-in ${role} role`,
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    () => {
      const eventId = `${role}-access-${uuidv4()}`;
      const ruleUuid = `${role}-access-${uuidv4()}`;
      const featureId = `${role}-access-${uuidv4()}`;
      const toolFeatureId = `${role}-tool-access-${uuidv4()}`;
      let sourceId: string;
      let sourceSlug: string;
      let headers: Record<string, string>;
      let toolHeaders: Record<string, string>;

      apiTest.beforeAll(async ({ apiServices, esClient, kbnClient, samlAuth }) => {
        // Detection writes are rejected while Significant Events is paused.
        await apiServices.significantEventsTest.resumeSignificantEvents();
        await seedSignificantEvent(esClient, eventId);
        ({ id: sourceId, slug: sourceSlug } = await createAccessSource({
          kbnClient,
          title: `${role}-access-${uuidv4()}`,
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
        await deleteAccessSource({ kbnClient, sourceId });
      });

      apiTest('closes a significant event', async ({ apiClient }) => {
        await expect
          .poll(async () => {
            const response = await apiClient.get(`${EVENTS_ENDPOINT}/${eventId}`, {
              headers,
              responseType: 'json',
            });
            return response.statusCode;
          }, POLL_OPTIONS)
          .toBe(200);

        const response = await apiClient.post(`${EVENTS_ENDPOINT}/${eventId}/update`, {
          headers,
          body: { status: 'inactive', assessment_note: `Closed by ${role}` },
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
          body: { rule_uuids: [ruleUuid], scanned_by: role },
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

      apiTest('creates and deletes a knowledge indicator', async ({ apiClient }) => {
        const createResponse = await apiClient.post(getFeaturesEndpoint(sourceId), {
          headers,
          body: buildFeature(featureId),
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body).toStrictEqual({ acknowledged: true });

        const deleteResponse = await apiClient.delete(
          `${getFeaturesEndpoint(sourceId)}/${featureId}`,
          {
            headers,
            responseType: 'json',
          }
        );
        expect(deleteResponse).toHaveStatusCode(200);
      });

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
    }
  );
}
