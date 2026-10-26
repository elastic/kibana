/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest } from '../fixtures';
import { ALERT_DETAILS_CONTEXT_API_PATH, INTERNAL_HEADERS } from '../fixtures/constants';
import {
  buildContextQuery,
  type AlertDetailsContextResponse,
} from '../fixtures/alert_context_data';

apiTest.describe(
  'Observability alert details context for AI assistant contextual insights',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ apmSynthtraceEsClient, logsSynthtraceEsClient }) => {
      // Guarantee an empty cluster so the "no data" expectation is deterministic
      // regardless of the order Scout runs the sibling alert-details specs.
      await apmSynthtraceEsClient.clean();
      await logsSynthtraceEsClient.clean();
    });

    apiTest(
      'returns nothing when no traces or logs are available',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.get(
          `${ALERT_DETAILS_CONTEXT_API_PATH}?${buildContextQuery({
            alert_started_at: new Date().toISOString(),
          })}`,
          { headers: { ...INTERNAL_HEADERS, ...cookieHeader }, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(200);
        const { alertContext } = response.body as AlertDetailsContextResponse;
        expect(alertContext).toStrictEqual([]);
      }
    );

    apiTest('is not available to unauthorized users', async ({ apiClient, samlAuth }) => {
      // A role granted only an unrelated Kibana feature (Discover) is authenticated
      // but still lacks the `ai_assistant` privilege the route requires. A role with
      // no privileges at all is rejected by the Kibana role API.
      const { cookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [], indices: [] },
        kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
      });

      const response = await apiClient.get(
        `${ALERT_DETAILS_CONTEXT_API_PATH}?${buildContextQuery({
          alert_started_at: moment().toISOString(),
        })}`,
        { headers: { ...INTERNAL_HEADERS, ...cookieHeader }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(403);
      expect((response.body as { message: string }).message).toContain('ai_assistant');
    });
  }
);
