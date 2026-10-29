/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { KibanaRole } from '@kbn/scout-oblt';
import {
  apiTest,
  COMMON_HEADERS,
  startInvestigation,
  uniqueId,
  waitForInvestigation,
} from '../fixtures';

const INVESTIGATIONS_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['all'] }, spaces: ['*'] }],
};

const START_PATH = 'internal/nightshift/investigations';

apiTest.describe(
  'POST /internal/nightshift/investigations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('returns 400 when the request body is empty', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
      const response = await apiClient.post(START_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: {},
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an invalid subject type', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
      const response = await apiClient.post(START_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { subject: { type: 'not_a_valid_type', id: 'some-id' } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 400 for a significant event subject, which is not accepted by this route',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: {
            subject: { type: 'significant_event', id: 'se-1' },
            title: 'Investigate significant event',
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'returns 400 when an entry of subject.ids exceeds 500 characters',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', ids: ['x'.repeat(501)] } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest('returns 400 when subject.ids is empty', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
      const response = await apiClient.post(START_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        body: { subject: { type: 'alert', ids: [] } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    // Without this, every negative test above would still pass if the alert branch rejected
    // every body it was given. A well-formed alert body passes validation and reaches the
    // server-side alert lookup, which returns 404 because the alert does not exist.
    apiTest(
      'returns 404 for a well-formed alert body whose alert does not exist',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', ids: ['alert-uuid-1'] } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(404);
      }
    );

    apiTest(
      'starts an investigation for a v2 alert without a rule',
      async ({ apiClient, samlAuth, esClient }) => {
        const episodeId = uniqueId('episode');
        const ruleName = `Ad hoc ${episodeId}`;
        await esClient.index({
          index: '.rule-events',
          op_type: 'create',
          refresh: true,
          document: {
            '@timestamp': new Date().toISOString(),
            scheduled_timestamp: new Date().toISOString(),
            type: 'alert',
            source: 'elastic.significant_events',
            status: 'breached',
            severity: 'medium',
            alert: { id: episodeId, status: 'active' },
            group_hash: episodeId,
            space_id: 'default',
            data: { rule_name: ruleName },
          },
        });
        try {
          const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
          const response = await startInvestigation(apiClient, cookieHeader, {
            subject: { type: 'alert', ids: [episodeId] },
          });
          expect(response).toHaveStatusCode(200);
          const investigation = await waitForInvestigation(
            apiClient,
            cookieHeader,
            response.body.investigation_id
          );
          expect(investigation.subjects[0].snapshot).toMatchObject({
            alert_version: 'v2',
            rule_name: ruleName,
          });
          expect(investigation.subjects[0].snapshot?.rule_id).toBeUndefined();
        } finally {
          await esClient.deleteByQuery({
            index: '.rule-events',
            query: { term: { 'alert.id': episodeId } },
            refresh: true,
          });
        }
      }
    );

    apiTest(
      'returns 403 for a user without agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const response = await apiClient.post(START_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { subject: { type: 'alert', ids: ['some-id'] } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
