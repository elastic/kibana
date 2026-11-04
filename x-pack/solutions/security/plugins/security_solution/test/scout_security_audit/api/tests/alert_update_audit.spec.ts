/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

import type { RoleApiCredentials } from '@kbn/scout-security';
import { apiTest, getPlaywrightTagsFor, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
  DETECTION_ENGINE_ALERT_TAGS_URL,
  DETECTION_ENGINE_INDEX_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
} from '../../../../common/constants';

/** Matches `AUDIT_LOG_PATH` from the Scout `security_audit` server config set. */
const AUDIT_LOG_PATH = '/tmp/kibana-scout-security-audit.log';

const waitForAuditEvent = async (
  filter: (event: Record<string, unknown>) => boolean,
  timeoutMs = 10_000
): Promise<Record<string, unknown>> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const lines = readFileSync(AUDIT_LOG_PATH, 'utf8').split('\n').filter(Boolean);
      const events = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
      const match = events.reverse().find(filter);
      if (match) return match;
    } catch {
      // file not yet created — retry
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timed out waiting for matching audit event in ${AUDIT_LOG_PATH}`);
};

/** Default space security alerts index (write alias). */
const ALERTS_INDEX = '.alerts-security.alerts-default';

const REQUEST_HEADERS = {
  'kbn-xsrf': 'scout',
  ...PUBLIC_API_HEADERS,
};

const eventAction = (event: Record<string, unknown>): string | undefined =>
  (event.event as Record<string, unknown> | undefined)?.action as string | undefined;

const eventOutcome = (event: Record<string, unknown>): string | undefined =>
  (event.event as Record<string, unknown> | undefined)?.outcome as string | undefined;

apiTest.describe(
  'Security Solution alert update audit events',
  {
    tag: [
      ...getPlaywrightTagsFor('stateful', 'classic', 'local'),
      ...getPlaywrightTagsFor('serverless', 'security_complete', 'local'),
    ],
  },
  () => {
    let admin: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      admin = await requestAuth.getApiKey('admin');
    });

    apiTest(
      'signals/status by ids with closed writes alert_update unknown with user.name and trace.id',
      async ({ apiClient }) => {
        const testStart = Date.now();
        const alertId = `scout-audit-closed-${testStart}`;

        const response = await apiClient.post(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
          headers: { ...REQUEST_HEADERS, ...admin.apiKeyHeader },
          body: { signal_ids: [alertId], status: 'closed' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        const e = await waitForAuditEvent(
          (ev) =>
            eventAction(ev) === 'alert_update' &&
            eventOutcome(ev) === 'unknown' &&
            (ev.message as string | undefined)?.includes(alertId) === true &&
            new Date((ev['@timestamp'] as string) ?? 0).getTime() >= testStart
        );

        expect(e).toMatchObject({
          event: { action: 'alert_update', outcome: 'unknown' },
        });
        const user = e.user as Record<string, unknown> | undefined;
        expect(user?.name).toBeDefined();
        const trace = e.trace as Record<string, unknown> | undefined;
        expect(trace?.id).toBeDefined();
      }
    );

    apiTest(
      'signals/status by ids with acknowledged writes alert_update then alert_acknowledge success',
      async ({ apiClient, esClient }) => {
        const testStart = Date.now();
        const alertId = `scout-audit-acknowledged-${testStart}`;

        // The acknowledge event is only written when at least one alert was updated,
        // so a real open alert must exist. Ensure the alerts index exists, then seed one.
        // The create op type is required because the alerts target is a data stream on serverless.
        const indexResponse = await apiClient.post(DETECTION_ENGINE_INDEX_URL, {
          headers: { ...REQUEST_HEADERS, ...admin.apiKeyHeader },
          responseType: 'json',
        });
        expect(indexResponse).toHaveStatusCode(200);

        await esClient.index({
          index: ALERTS_INDEX,
          id: alertId,
          op_type: 'create',
          refresh: 'wait_for',
          document: {
            '@timestamp': new Date().toISOString(),
            'kibana.alert.workflow_status': 'open',
            'kibana.space_ids': ['default'],
          },
        });

        try {
          const response = await apiClient.post(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
            headers: { ...REQUEST_HEADERS, ...admin.apiKeyHeader },
            body: { signal_ids: [alertId], status: 'acknowledged' },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(200);
          expect(response.body).toMatchObject({ updated: 1 });

          const updateEvent = await waitForAuditEvent(
            (ev) =>
              eventAction(ev) === 'alert_update' &&
              eventOutcome(ev) === 'unknown' &&
              (ev.message as string | undefined)?.includes(alertId) === true &&
              new Date((ev['@timestamp'] as string) ?? 0).getTime() >= testStart
          );
          expect(updateEvent).toMatchObject({
            event: { action: 'alert_update', outcome: 'unknown' },
          });
          const traceId = (updateEvent.trace as Record<string, unknown> | undefined)?.id;
          expect(traceId).toBeDefined();

          // The acknowledge event is bulk and has no alert id, so match it by trace.id.
          const acknowledgeEvent = await waitForAuditEvent(
            (ev) =>
              eventAction(ev) === 'alert_acknowledge' &&
              eventOutcome(ev) === 'success' &&
              (ev.trace as Record<string, unknown> | undefined)?.id === traceId &&
              new Date((ev['@timestamp'] as string) ?? 0).getTime() >= testStart
          );
          expect(acknowledgeEvent).toMatchObject({
            event: { action: 'alert_acknowledge', outcome: 'success' },
          });
        } finally {
          await esClient.deleteByQuery(
            {
              index: ALERTS_INDEX,
              query: { ids: { values: [alertId] } },
              refresh: true,
              conflicts: 'proceed',
            },
            { ignore: [404] }
          );
        }
      }
    );

    apiTest('signals/tags writes alert_update', async ({ apiClient }) => {
      const testStart = Date.now();
      const alertId = `scout-audit-tags-${testStart}`;

      const response = await apiClient.post(DETECTION_ENGINE_ALERT_TAGS_URL, {
        headers: { ...REQUEST_HEADERS, ...admin.apiKeyHeader },
        body: {
          ids: [alertId],
          tags: { tags_to_add: ['scout-audit-tag'], tags_to_remove: [] },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);

      const e = await waitForAuditEvent(
        (ev) =>
          eventAction(ev) === 'alert_update' &&
          eventOutcome(ev) === 'unknown' &&
          (ev.message as string | undefined)?.includes(alertId) === true &&
          new Date((ev['@timestamp'] as string) ?? 0).getTime() >= testStart
      );
      expect(e).toMatchObject({ event: { action: 'alert_update', outcome: 'unknown' } });
    });

    apiTest('signals/assignees writes alert_update', async ({ apiClient }) => {
      const testStart = Date.now();
      const alertId = `scout-audit-assignees-${testStart}`;

      const response = await apiClient.post(DETECTION_ENGINE_ALERT_ASSIGNEES_URL, {
        headers: { ...REQUEST_HEADERS, ...admin.apiKeyHeader },
        body: {
          ids: [alertId],
          assignees: { add: ['scout-user'], remove: [] },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);

      const e = await waitForAuditEvent(
        (ev) =>
          eventAction(ev) === 'alert_update' &&
          eventOutcome(ev) === 'unknown' &&
          (ev.message as string | undefined)?.includes(alertId) === true &&
          new Date((ev['@timestamp'] as string) ?? 0).getTime() >= testStart
      );
      expect(e).toMatchObject({ event: { action: 'alert_update', outcome: 'unknown' } });
    });

    apiTest(
      'signals/status by query with an invalid Elasticsearch query writes alert_update failure',
      async ({ apiClient }) => {
        const testStart = Date.now();
        const marker = `scout-audit-invalid-query-${testStart}`;

        // Ensure the alerts index exists so the request reaches Elasticsearch
        // and fails on the query, not on a missing index.
        const indexResponse = await apiClient.post(DETECTION_ENGINE_INDEX_URL, {
          headers: { ...REQUEST_HEADERS, ...admin.apiKeyHeader },
          responseType: 'json',
        });
        expect(indexResponse).toHaveStatusCode(200);

        // An unknown query type makes Elasticsearch reject `_update_by_query` with a 400,
        // which reaches auditAlertUpdateFailure in updateSignalsStatusByQuery.
        const response = await apiClient.post(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
          headers: { ...REQUEST_HEADERS, ...admin.apiKeyHeader },
          body: {
            query: { scout_audit_unknown_query_type: { marker } },
            status: 'closed',
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);

        const e = await waitForAuditEvent(
          (ev) =>
            eventAction(ev) === 'alert_update' &&
            eventOutcome(ev) === 'failure' &&
            (ev.message as string | undefined)?.includes(marker) === true &&
            new Date((ev['@timestamp'] as string) ?? 0).getTime() >= testStart
        );
        expect(e).toMatchObject({
          event: { action: 'alert_update', outcome: 'failure' },
        });
        expect(e.message).toContain('Failed attempt to update alerts');
        expect(e.error).toMatchObject({
          code: 'ResponseError',
          message: expect.stringContaining('parsing_exception'),
        });
      }
    );
  }
);
