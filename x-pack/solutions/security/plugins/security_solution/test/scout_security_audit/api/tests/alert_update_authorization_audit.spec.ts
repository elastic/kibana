/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import type { KibanaRole } from '@kbn/scout-security';
import { AUDIT_LOG_PATH, PUBLIC_API_HEADERS, apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../common/constants';

const HOOK_MESSAGE = 'Failed attempt to update alerts because required privileges were not granted';

interface AuditEvent {
  '@timestamp': string;
  message: string;
  event: { action: string };
}

const readMessages = (since: number): string[] => {
  try {
    return readFileSync(AUDIT_LOG_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEvent)
      .filter((e) => e.event?.action === 'alert_update' && Date.parse(e['@timestamp']) >= since)
      .map((e) => e.message);
  } catch {
    return []; // the file does not exist until the first event is written
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Route authorization passes, then Elasticsearch returns 403 inside the handler.
const noIndexAccess: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};
// Security `read` is not granted, so route authorization rejects the request.
const noSecurity: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
};

apiTest.describe('Alert update route authorization audit', { tag: tags.stateful.classic }, () => {
  apiTest(
    'audits a route authorization 403 once, and a handler-side 403 not at all',
    async ({ apiClient, requestAuth }) => {
      const alertId = randomUUID();
      const post = async (role: KibanaRole) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role);
        return apiClient.post(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
          headers: { ...apiKeyHeader, ...PUBLIC_API_HEADERS, 'kbn-xsrf': 'true' },
          responseType: 'json',
          body: { status: 'closed', query: { bool: { filter: { terms: { _id: [alertId] } } } } },
        });
      };

      const start = Date.now();
      expect(await post(noIndexAccess)).toHaveStatusCode(403);
      expect(await post(noSecurity)).toHaveStatusCode(403);

      // Audit events are written asynchronously: wait for the expected hook event, then give a
      // wrongly emitted extra one (from either request) time to show up.
      for (let i = 0; i < 50 && !readMessages(start).includes(HOOK_MESSAGE); i++) await sleep(300);
      await sleep(1_000);

      const messages = readMessages(start);
      expect(messages.filter((m) => m === HOOK_MESSAGE)).toHaveLength(1);
      expect(messages.some((m) => m.includes(alertId))).toBe(true); // handler ran and audited itself
    }
  );
});
