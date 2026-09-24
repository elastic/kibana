/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { v4 as uuidv4 } from 'uuid';
import {
  NIGHTSHIFT_FEATURE_ID,
  NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID,
} from '@kbn/nightshift-shared';
import type { SignificantEventsAvailabilityResponse } from '../../../../../common';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const AVAILABILITY_ENDPOINT = 'internal/significant_events/availability';
const DISCOVERY_ENDPOINT = 'internal/streams/significant_events/discovery/_execute';
const ONBOARDING_BULK_STATUS_ENDPOINT = 'internal/streams/onboarding/_bulk_status';
const onboardingEndpoint = (streamName: string) =>
  `internal/streams/${streamName}/onboarding/_execute`;

// A Nightshift manager (route-level authz passes) with read-only ES access, isolating the
// resource-specific ES preflight gate from Kibana feature authorization.
const readOnlyManagerRole: KibanaRole = {
  kibana: [
    {
      base: [],
      feature: { [NIGHTSHIFT_FEATURE_ID]: ['all', NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID] },
      spaces: ['*'],
    },
  ],
  elasticsearch: {
    cluster: ['monitor'],
    indices: [
      { names: ['logs*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.ds-logs*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.kibana_streams*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.significant_events*'], privileges: ['read', 'view_index_metadata'] },
    ],
  },
};

// Same manager, granted write only on the knowledge indicators data stream, to prove privileges
// are reported per resource.
const kiWriterRole: KibanaRole = {
  kibana: readOnlyManagerRole.kibana,
  elasticsearch: {
    cluster: ['monitor'],
    indices: [
      { names: ['logs*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.ds-logs*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.kibana_streams*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.significant_events-knowledge_indicators*'], privileges: ['read', 'write'] },
      { names: ['.significant_events-detections*'], privileges: ['read'] },
      { names: ['.significant_events-events*'], privileges: ['read'] },
    ],
  },
};

apiTest.describe(
  'Significant Events resource access authorization',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'reports read-only user privileges for a streams read-only user',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsReadOnly();

        const response = await apiClient.get(AVAILABILITY_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as SignificantEventsAvailabilityResponse;
        expect(body).toMatchObject({
          available: true,
          privileges: {
            knowledgeIndicators: { read: true, write: false },
            significantEvents: { read: true, write: false },
          },
        });
      }
    );

    apiTest(
      'reports per-resource privileges (knowledge indicator write, no significant events write)',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(kiWriterRole);

        const response = await apiClient.get(AVAILABILITY_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = response.body as SignificantEventsAvailabilityResponse;
        expect(body).toMatchObject({
          available: true,
          privileges: {
            knowledgeIndicators: { write: true },
            significantEvents: { write: false },
          },
        });
      }
    );

    apiTest(
      'denies KI onboarding scheduling without knowledge indicator write access and queues nothing',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(readOnlyManagerRole);
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };
        const streamName = `logs.ki_denied_${uuidv4().slice(0, 8)}`;

        const now = Date.now();
        const response = await apiClient.post(onboardingEndpoint(streamName), {
          headers,
          body: {
            action: 'schedule',
            from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
            to: new Date(now).toISOString(),
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);

        // Preflight denial must not queue a background task.
        const { cookieHeader: adminCookie } = await samlAuth.asStreamsAdmin();
        const status = await apiClient.post(ONBOARDING_BULK_STATUS_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...adminCookie },
          body: { streamNames: [streamName] },
          responseType: 'json',
        });
        expect(status).toHaveStatusCode(200);
        expect(status.body[streamName]).toStrictEqual({
          status: 'not_started',
          executionId: null,
        });
      }
    );

    apiTest(
      'denies significant events discovery without write access',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(readOnlyManagerRole);

        const response = await apiClient.post(DISCOVERY_ENDPOINT, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: { action: 'trigger' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'allows significant events discovery with full privileges',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asStreamsAdmin();
        const headers = { ...COMMON_API_HEADERS, ...cookieHeader };

        let triggered = false;
        try {
          const response = await apiClient.post(DISCOVERY_ENDPOINT, {
            headers,
            body: { action: 'trigger' },
            responseType: 'json',
          });

          triggered = response.statusCode === 200;
          expect(response).toHaveStatusCode(200);
          expect(response.body).toHaveProperty('executionId');
        } finally {
          if (triggered) {
            await apiClient.post(DISCOVERY_ENDPOINT, {
              headers,
              body: { action: 'cancel' },
              responseType: 'json',
            });
          }
        }
      }
    );
  }
);
