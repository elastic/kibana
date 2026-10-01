/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  LOCAL_PUBLIC_LOCATION,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import { bulkCreateMonitors, getMonitor } from '../../../common/fixtures/monitors';

interface BulkCreateResult {
  id: string;
  created: boolean;
  error?: string;
}

apiTest.describe(
  'CreateMonitorBulkAPI',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    });

    apiTest('creates multiple monitors in one request', async ({ apiClient }) => {
      const monitors = [1, 2].map((index) => ({
        type: 'http',
        name: `bulk-create-${index}-${uuidv4()}`,
        url: `https://example.com/${index}`,
        locations: [LOCAL_PUBLIC_LOCATION.id],
      }));

      const response = await bulkCreateMonitors(apiClient, editorHeaders, { monitors });
      const result = response.body.result as BulkCreateResult[];

      expect(result).toHaveLength(monitors.length);
      expect(result.every((entry) => entry.created && entry.id)).toBe(true);

      await Promise.all(
        result.map(async ({ id }, index) => {
          const { body } = await getMonitor(apiClient, editorHeaders, id);
          expect((body as { name: string }).name).toBe(monitors[index].name);
        })
      );
    });

    apiTest(
      'rejects duplicate monitor names before creating any monitor',
      async ({ apiClient }) => {
        const name = `duplicate-bulk-create-${uuidv4()}`;
        const response = await bulkCreateMonitors(
          apiClient,
          editorHeaders,
          {
            monitors: [
              {
                type: 'http',
                name,
                url: 'https://example.com/one',
                locations: [LOCAL_PUBLIC_LOCATION.id],
              },
              {
                type: 'http',
                name,
                url: 'https://example.com/two',
                locations: [LOCAL_PUBLIC_LOCATION.id],
              },
            ],
          },
          { statusCode: 400 }
        );

        expect((response.body as { message: string }).message).toMatch(/already exists/i);
      }
    );
  }
);
