/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import { formatKibanaNamespace } from '../../../../../common/formatters';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  PUBLIC_API_VERSION,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import {
  addMonitor,
  omitMonitorKeys,
  parseMonitorResponse,
  saveMonitorInternal,
} from '../../../common/fixtures/monitors';
import { httpMonitorFixture } from '../../../common/fixtures/data/http_monitor';

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/synthetics/create_monitor.ts`.
 *
 * The FTR suite carried `skipCloud`/`skipMKI`; the equivalent Scout coverage is
 * local stateful + serverless only.
 */
apiTest.describe(
  'AddNewMonitorsUI',
  {
    tag: ['@local-stateful-classic', '@local-serverless-observability_complete'],
  },
  () => {
    let editorHeaders: Record<string, string>;
    let privateLocation: { id: string; label: string };

    apiTest.beforeAll(async ({ requestAuth, apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      privateLocation = await apiServices.syntheticsPrivateLocations.getSharedPrivateLocation();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    });

    apiTest('returns the newly added monitor', async ({ apiClient }) => {
      const newMonitor = {
        ...httpMonitorFixture,
        locations: [privateLocation],
      };

      const res = await addMonitor(apiClient, editorHeaders, newMonitor);

      expect(parseMonitorResponse(res.body as Record<string, unknown>)).toStrictEqual(
        omitMonitorKeys(newMonitor)
      );
    });

    apiTest(
      'honors an explicitly set namespace, even the default sentinel, for non-internal API calls',
      async ({ apiClient, apiServices, kbnClient }) => {
        const SPACE_ID = `test-space-${uuidv4()}`;
        const SPACE_NAME = `test-space-name ${uuidv4()}`;

        await kbnClient.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
        try {
          const spacePrivateLocation =
            await apiServices.syntheticsPrivateLocations.addTestPrivateLocation(SPACE_ID);

          const monitor = {
            ...httpMonitorFixture,
            namespace: 'default',
            locations: [spacePrivateLocation],
            spaces: [],
          };

          const res = await apiClient.post(`s/${SPACE_ID}/api/synthetics/monitors`, {
            headers: { ...editorHeaders, 'elastic-api-version': PUBLIC_API_VERSION },
            body: monitor,
            responseType: 'json',
          });
          expect(res).toHaveStatusCode(200);
          expect((res.body as Record<string, unknown>).namespace).toBe('default');
        } finally {
          await kbnClient.spaces.delete(SPACE_ID);
        }
      }
    );

    apiTest(
      'sets namespace to the Kibana space for internal (UI) calls that leave it at the default sentinel',
      async ({ apiClient, apiServices, kbnClient }) => {
        const SPACE_ID = `test-space-${uuidv4()}`;
        const SPACE_NAME = `test-space-name ${uuidv4()}`;
        const EXPECTED_NAMESPACE = formatKibanaNamespace(SPACE_ID);

        await kbnClient.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
        try {
          const spacePrivateLocation =
            await apiServices.syntheticsPrivateLocations.addTestPrivateLocation(SPACE_ID);

          const monitor = {
            ...httpMonitorFixture,
            namespace: 'default',
            locations: [spacePrivateLocation],
            spaces: [],
          };

          const res = await saveMonitorInternal(apiClient, editorHeaders, monitor, {
            spaceId: SPACE_ID,
          });
          expect((res.body as Record<string, unknown>).namespace).toStrictEqual(EXPECTED_NAMESPACE);
        } finally {
          await kbnClient.spaces.delete(SPACE_ID);
        }
      }
    );

    apiTest('creates a monitor with a caller-supplied id in the body', async ({ apiClient }) => {
      const customId = `custom-monitor-id-${uuidv4()}`;
      const newMonitor = {
        ...httpMonitorFixture,
        locations: [privateLocation],
      };

      const res = await apiClient.post('api/synthetics/monitors', {
        headers: { ...editorHeaders, 'elastic-api-version': PUBLIC_API_VERSION },
        body: { ...newMonitor, id: customId },
        responseType: 'json',
      });

      expect(res).toHaveStatusCode(200);
      expect((res.body as Record<string, unknown>).id).toStrictEqual(customId);
      expect((res.body as Record<string, unknown>).config_id).toStrictEqual(customId);
    });

    apiTest(
      'rejects creating a second monitor that reuses an existing id',
      async ({ apiClient }) => {
        const customId = `custom-monitor-id-${uuidv4()}`;
        const firstName = 'custom-id-collision-first';
        const secondName = 'custom-id-collision-second';
        const newMonitor = {
          ...httpMonitorFixture,
          locations: [privateLocation],
        };

        const first = await apiClient.post('api/synthetics/monitors', {
          headers: { ...editorHeaders, 'elastic-api-version': PUBLIC_API_VERSION },
          body: { ...newMonitor, id: customId, name: firstName },
          responseType: 'json',
        });
        expect(first).toHaveStatusCode(200);

        const second = await apiClient.post('api/synthetics/monitors', {
          headers: { ...editorHeaders, 'elastic-api-version': PUBLIC_API_VERSION },
          body: { ...newMonitor, id: customId, name: secondName },
          responseType: 'json',
        });
        expect(second).toHaveStatusCode(409);

        // the original monitor must be untouched by the rejected second create
        const getRes = await apiClient.get(`api/synthetics/monitors/${customId}`, {
          headers: { ...editorHeaders, 'elastic-api-version': PUBLIC_API_VERSION },
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect((getRes.body as Record<string, unknown>).name).toBe(firstName);
      }
    );
  }
);
