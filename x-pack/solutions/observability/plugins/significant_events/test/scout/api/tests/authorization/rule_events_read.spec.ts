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
import {
  NIGHTSHIFT_FEATURE_ID,
  SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ,
} from '@kbn/nightshift-shared';
import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const EVENTS_ENDPOINT = 'internal/significant_events/events';
const RULE_EVENTS_INDEX = '.rule-events';
// On Cloud, a flag override reaches every node on its next ~10s config poll.
const POLL_OPTIONS = { timeout: 30_000, intervals: [1_000] };

// No Alerting v2 feature privilege and no index privileges: `.rule-events` read must come from the
// implicit grant attached to Nightshift's `alerts: { read: true }`.
const NIGHTSHIFT_READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['read'] }, spaces: ['*'] }],
};

apiTest.describe(
  'Significant Events read from .rule-events',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const eventId = `rule-events-read-${uuidv4()}`;

    apiTest.beforeAll(async ({ apiServices, esClient }) => {
      const now = new Date().toISOString();
      await esClient.index({
        index: RULE_EVENTS_INDEX,
        op_type: 'create',
        refresh: true,
        document: {
          '@timestamp': now,
          scheduled_timestamp: now,
          type: 'alert',
          source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
          space_id: 'default',
          status: 'breached',
          severity: 'high',
          group_hash: eventId,
          rule: { id: eventId, version: 1 },
          alert: { id: eventId, status: 'active' },
          data: { event_id: eventId, title: 'Rule events read check', stream_names: [] },
        },
      });
      await apiServices.core.settings({
        'feature_flags.overrides': { [SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ]: true },
      });
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ]: null },
      });
      await esClient.deleteByQuery({
        index: RULE_EVENTS_INDEX,
        query: { term: { group_hash: eventId } },
        refresh: true,
        ignore_unavailable: true,
      });
    });

    apiTest(
      'returns events to a Nightshift reader without Alerting v2 or index privileges',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ONLY_ROLE);

        await expect
          .poll(async () => {
            const response = await apiClient.get(`${EVENTS_ENDPOINT}?event_id=${eventId}`, {
              headers: { ...COMMON_API_HEADERS, ...cookieHeader },
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
      }
    );
  }
);
