/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import type { KibanaRole } from '@kbn/scout-oblt';
import { syntheticsMonitorSavedObjectType } from '../../../../../common/types/saved_objects';
import {
  apiTest,
  LOCAL_PUBLIC_LOCATION,
  mergeSyntheticsApiHeaders,
} from '../../../common/fixtures';
import {
  bulkCreateMonitors,
  deleteMonitors,
  getMonitor,
  listMonitors,
} from '../../../common/fixtures/monitors';

interface BulkCreateResult {
  id: string;
  created: boolean;
  error?: string;
}

const UPTIME_ALL_IN_DEFAULT_SPACE_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [{ base: [], feature: { uptime: ['all'] }, spaces: ['default'] }],
};

const filterByMonitorName = (name: string) =>
  `${syntheticsMonitorSavedObjectType}.attributes.name.keyword: "${name}"`;

apiTest.describe(
  'CreateMonitorBulkAPI',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorHeaders: Record<string, string>;
    let defaultSpaceOnlyHeaders: Record<string, string>;
    const createdMonitorIds: string[] = [];
    const spacesToCleanUp: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      const { apiKeyHeader: defaultSpaceOnlyKey } = await requestAuth.getApiKeyForCustomRole(
        UPTIME_ALL_IN_DEFAULT_SPACE_ROLE
      );
      defaultSpaceOnlyHeaders = mergeSyntheticsApiHeaders(defaultSpaceOnlyKey, {
        Accept: 'application/json',
      });
    });

    apiTest.afterAll(async ({ apiClient, kbnClient }) => {
      if (createdMonitorIds.length > 0) {
        await deleteMonitors(apiClient, editorHeaders, createdMonitorIds, { ignoreErrors: true });
      }
      await Promise.all(spacesToCleanUp.map((spaceId) => kbnClient.spaces.delete(spaceId)));
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

      createdMonitorIds.push(...result.filter(({ created }) => created).map(({ id }) => id));
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
                name: name.toUpperCase(),
                url: 'https://example.com/two',
                locations: [LOCAL_PUBLIC_LOCATION.id],
              },
            ],
          },
          { statusCode: 400 }
        );

        expect((response.body as { message: string }).message).toMatch(/already exists/i);
        const listed = await listMonitors(
          apiClient,
          editorHeaders,
          `filter=${encodeURIComponent(filterByMonitorName(name))}`
        );
        expect((listed.body as { total: number }).total).toBe(0);
      }
    );

    apiTest(
      'rejects persisted duplicate names before creating earlier valid monitors',
      async ({ apiClient }) => {
        const existingName = `persisted-duplicate-bulk-create-${uuidv4()}`;
        const newName = `should-not-create-bulk-${uuidv4()}`;
        const existingResponse = await bulkCreateMonitors(apiClient, editorHeaders, {
          monitors: [
            {
              type: 'http',
              name: existingName,
              url: 'https://example.com/existing',
              locations: [LOCAL_PUBLIC_LOCATION.id],
            },
          ],
        });
        const existingResult = existingResponse.body.result as BulkCreateResult[];
        createdMonitorIds.push(
          ...existingResult.filter(({ created }) => created).map(({ id }) => id)
        );
        expect(existingResult).toStrictEqual([expect.objectContaining({ created: true })]);

        const response = await bulkCreateMonitors(
          apiClient,
          editorHeaders,
          {
            monitors: [
              {
                type: 'http',
                name: newName,
                url: 'https://example.com/valid-but-rejected',
                locations: [LOCAL_PUBLIC_LOCATION.id],
              },
              {
                type: 'http',
                name: existingName.toUpperCase(),
                url: 'https://example.com/duplicate',
                locations: [LOCAL_PUBLIC_LOCATION.id],
              },
            ],
          },
          { statusCode: 400 }
        );

        expect((response.body as { message: string }).message).toMatch(/already exists/i);
        const listed = await listMonitors(
          apiClient,
          editorHeaders,
          `filter=${encodeURIComponent(filterByMonitorName(newName))}`
        );
        expect((listed.body as { total: number }).total).toBe(0);
      }
    );

    apiTest(
      'rejects a target space the caller cannot access before persisting monitors',
      async ({ apiClient, kbnClient }) => {
        const spaceId = `bulk-create-restricted-${uuidv4()}`;
        const name = `restricted-bulk-create-${uuidv4()}`;
        await kbnClient.spaces.create({ id: spaceId, name: `Bulk create restricted ${uuidv4()}` });
        spacesToCleanUp.push(spaceId);

        await bulkCreateMonitors(
          apiClient,
          defaultSpaceOnlyHeaders,
          {
            monitors: [
              {
                type: 'http',
                name,
                url: 'https://example.com/restricted',
                locations: [LOCAL_PUBLIC_LOCATION.id],
                spaces: [spaceId],
              },
            ],
          },
          { statusCode: 403 }
        );

        const listed = await listMonitors(
          apiClient,
          editorHeaders,
          `filter=${encodeURIComponent(filterByMonitorName(name))}`,
          { spaceId }
        );
        expect((listed.body as { total: number }).total).toBe(0);
      }
    );
  }
);
