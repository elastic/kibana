/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { AUDIT_LOG_PATH } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../common/constants';
import {
  apiTest,
  tags,
  AUTHORIZATION_FAILURE_AUDIT_MESSAGE,
  KIBANA_ALL_NO_INDEX_PRIVILEGES_ROLE,
  NO_SECURITY_PRIVILEGES_ROLE,
  PUBLIC_HEADERS,
} from '../fixtures';

interface AuditEvent {
  '@timestamp'?: string;
  message?: string;
  event?: { action?: string; outcome?: string };
}

const SETTLE_MS = 2_000;

const readAuditEvents = (since: number): AuditEvent[] => {
  try {
    return readFileSync(AUDIT_LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEvent)
      .filter(({ '@timestamp': timestamp }) => new Date(timestamp ?? 0).getTime() >= since);
  } catch {
    // the file does not exist until the first event is written
    return [];
  }
};

const waitForAuditEvents = async (
  since: number,
  predicate: (events: AuditEvent[]) => boolean,
  timeoutMs = 15_000
): Promise<AuditEvent[]> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = readAuditEvents(since);
    if (predicate(events)) return events;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for audit events in ${AUDIT_LOG_PATH}`);
};

const isAuthorizationFailureEvent = ({ event, message }: AuditEvent): boolean =>
  event?.action === 'alert_update' &&
  event?.outcome === 'failure' &&
  message === AUTHORIZATION_FAILURE_AUDIT_MESSAGE;

apiTest.describe(
  'Alert update route authorization audit',
  { tag: [...tags.stateful.classic] },
  () => {
    apiTest(
      'audits a route authorization 403 once and adds no event for a handler-side 403',
      async ({ apiClient, requestAuth }) => {
        const alertId = randomUUID();
        const body = {
          status: 'closed',
          query: { bool: { filter: { terms: { _id: [alertId] } } } },
        };

        // 1. Rejected by route authorization before the handler runs.
        const { apiKeyHeader: noSecurityHeader } = await requestAuth.getApiKeyForCustomRole(
          NO_SECURITY_PRIVILEGES_ROLE
        );
        const deniedStart = Date.now();
        const deniedResponse = await apiClient.post(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
          headers: { ...noSecurityHeader, ...PUBLIC_HEADERS },
          responseType: 'json',
          body,
        });
        expect(deniedResponse).toHaveStatusCode(403);

        await waitForAuditEvents(
          deniedStart,
          (events) => events.filter(isAuthorizationFailureEvent).length > 0
        );
        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
        expect(readAuditEvents(deniedStart).filter(isAuthorizationFailureEvent)).toHaveLength(1);

        // 2. Authorized by route authorization, then 403 from Elasticsearch inside the handler.
        const { apiKeyHeader: noIndexPrivilegesHeader } = await requestAuth.getApiKeyForCustomRole(
          KIBANA_ALL_NO_INDEX_PRIVILEGES_ROLE
        );
        const handlerStart = Date.now();
        const handlerResponse = await apiClient.post(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
          headers: { ...noIndexPrivilegesHeader, ...PUBLIC_HEADERS },
          responseType: 'json',
          body,
        });
        expect(handlerResponse).toHaveStatusCode(403);

        // The handler audits its own failure for this request, which proves it ran.
        const handlerEvents = await waitForAuditEvents(handlerStart, (events) =>
          events.some(
            ({ event, message }) =>
              event?.action === 'alert_update' &&
              event?.outcome === 'failure' &&
              message?.includes(alertId)
          )
        );
        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
        expect(readAuditEvents(handlerStart).filter(isAuthorizationFailureEvent)).toHaveLength(0);
        expect(handlerEvents.length).toBeGreaterThan(0);
      }
    );
  }
);
