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
  EVENT_SEARCH_TOOL_ID,
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
  seedDetection,
  seedFeature,
  seedSignificantEvent,
} from '../../fixtures/built_in_role_access';

// The built-in `viewer` role has no index privileges on `.rule-events` or `.significant_events-*`.
// Reads rely on the implicit grants attached to the Nightshift `read` privilege.
apiTest.describe(
  'Significant Events access for the built-in viewer role',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const eventId = `viewer-access-${uuidv4()}`;
    const ruleUuid = `viewer-access-${uuidv4()}`;
    const featureId = `viewer-access-${uuidv4()}`;
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
        title: `viewer-access-${uuidv4()}`,
      }));
      await seedDetection({ kbnClient, ruleUuid, sourceId });
      await seedFeature({ kbnClient, sourceId, featureId });
      const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
      headers = { ...COMMON_API_HEADERS, ...cookieHeader };
      toolHeaders = { ...TOOL_API_HEADERS, ...cookieHeader };
    });

    apiTest.afterAll(async ({ esClient, kbnClient }) => {
      await deleteSignificantEvent(esClient, eventId);
      await deleteDetections(esClient, ruleUuid);
      await deleteFeature({ kbnClient, sourceId, featureId });
      await deleteAccessSource({ kbnClient, sourceId });
    });

    apiTest('lists and opens significant events', async ({ apiClient }) => {
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

      const response = await apiClient.get(`${EVENTS_ENDPOINT}/${eventId}`, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ event_id: eventId });
    });

    apiTest('lists detections', async ({ apiClient }) => {
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

    apiTest('lists knowledge indicators', async ({ apiClient }) => {
      const response = await apiClient.get(getFeaturesEndpoint(sourceId), {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.features).toStrictEqual(
        expect.arrayContaining([expect.objectContaining({ id: featureId, source_id: sourceId })])
      );
    });

    apiTest('cannot update significant events', async ({ apiClient }) => {
      const updateResponse = await apiClient.post(`${EVENTS_ENDPOINT}/${eventId}/update`, {
        headers,
        body: { status: 'inactive', assessment_note: 'Viewer must not close events' },
        responseType: 'json',
      });
      expect(updateResponse).toHaveStatusCode(403);

      const investigateResponse = await apiClient.post(
        `${EVENTS_ENDPOINT}/${eventId}/investigate`,
        { headers, responseType: 'json' }
      );
      expect(investigateResponse).toHaveStatusCode(403);
    });

    apiTest('cannot write detections', async ({ apiClient }) => {
      const createResponse = await apiClient.post(DETECTIONS_ENDPOINT, {
        headers,
        body: { detections: [buildDetection(`viewer-denied-${uuidv4()}`, sourceId)] },
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(403);

      const markScannedResponse = await apiClient.post(MARK_SCANNED_ENDPOINT, {
        headers,
        body: { rule_uuids: [ruleUuid], scanned_by: 'viewer' },
        responseType: 'json',
      });
      expect(markScannedResponse).toHaveStatusCode(403);
    });

    apiTest('cannot create or delete knowledge indicators', async ({ apiClient }) => {
      const createResponse = await apiClient.post(getFeaturesEndpoint(sourceId), {
        headers,
        body: buildFeature(`viewer-denied-${uuidv4()}`),
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(403);

      const deleteResponse = await apiClient.delete(
        `${getFeaturesEndpoint(sourceId)}/${featureId}`,
        {
          headers,
          responseType: 'json',
        }
      );
      expect(deleteResponse).toHaveStatusCode(403);
    });

    apiTest(
      'can search events but cannot create knowledge indicators from Agent Builder',
      async ({ apiClient }) => {
        await expect
          .poll(async () => {
            const response = await apiClient.post(TOOL_EXECUTE_ENDPOINT, {
              headers: toolHeaders,
              body: { tool_id: EVENT_SEARCH_TOOL_ID, tool_params: { event_ids: [eventId] } },
              responseType: 'json',
            });
            return {
              statusCode: response.statusCode,
              eventIds: (response.body.results?.[0]?.data?.events ?? []).map(
                ({ event_id: id }: { event_id: string }) => id
              ),
            };
          }, POLL_OPTIONS)
          .toStrictEqual({ statusCode: 200, eventIds: [eventId] });

        const createResponse = await apiClient.post(TOOL_EXECUTE_ENDPOINT, {
          headers: toolHeaders,
          body: {
            tool_id: KI_FEATURE_CREATE_TOOL_ID,
            tool_params: { ...buildFeature(`viewer-denied-${uuidv4()}`), slug: sourceSlug },
          },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        expect(createResponse.body.results).toStrictEqual([
          expect.objectContaining({
            type: 'error',
            data: expect.objectContaining({
              message: expect.stringContaining('requires the Nightshift manage privilege'),
            }),
          }),
        ]);
      }
    );
  }
);
