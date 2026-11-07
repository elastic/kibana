/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import { formatKibanaNamespace } from '../../../../../common/formatters';
import { DEFAULT_HTTP_ADVANCED_FIELDS } from '../../../../../common/constants/monitor_defaults';
import { ConfigKey } from '../../../../../common/runtime_types';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  PUBLIC_API_VERSION,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import {
  addMonitor,
  getMonitor,
  omitMonitorKeys,
  parseMonitorResponse,
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
      'hydrates default kerberos/ntlm when omitted from the request',
      async ({ apiClient }) => {
        const {
          [ConfigKey.KERBEROS]: _k,
          [ConfigKey.NTLM]: _n,
          ...withoutAuth
        } = httpMonitorFixture;
        const newMonitor = {
          ...withoutAuth,
          locations: [privateLocation],
          name: `omit-auth-${uuidv4()}`,
        };

        const res = await addMonitor(apiClient, editorHeaders, newMonitor);
        const body = parseMonitorResponse(res.body as Record<string, unknown>);

        expect(body).toMatchObject({
          [ConfigKey.KERBEROS]: DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.KERBEROS],
          [ConfigKey.NTLM]: DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.NTLM],
        });
        expect(body).toStrictEqual(
          omitMonitorKeys({
            ...newMonitor,
            [ConfigKey.KERBEROS]: DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.KERBEROS],
            [ConfigKey.NTLM]: DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.NTLM],
          })
        );
      }
    );

    apiTest(
      'sets namespace to Kibana space when not set to a custom namespace',
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

          const res = await apiClient.post(`s/${SPACE_ID}/api/synthetics/monitors`, {
            headers: { ...editorHeaders, 'elastic-api-version': PUBLIC_API_VERSION },
            body: monitor,
            responseType: 'json',
          });
          expect(res).toHaveStatusCode(200);
          expect((res.body as Record<string, unknown>).namespace).toStrictEqual(EXPECTED_NAMESPACE);
        } finally {
          await kbnClient.spaces.delete(SPACE_ID);
        }
      }
    );

    const newMonitor = () => ({
      ...httpMonitorFixture,
      name: `custom-id-${uuidv4()}`,
      locations: [privateLocation],
    });

    apiTest('creates a monitor with the id supplied in the body', async ({ apiClient }) => {
      const customId = `body-id-${uuidv4()}`;

      const res = await addMonitor(apiClient, editorHeaders, { ...newMonitor(), id: customId });

      expect(res.body).toMatchObject({ id: customId, config_id: customId });
    });

    apiTest('creates a monitor with the id supplied in the query', async ({ apiClient }) => {
      const customId = `query-id-${uuidv4()}`;

      const res = await addMonitor(apiClient, editorHeaders, newMonitor(), { id: customId });

      expect(res.body).toMatchObject({ id: customId, config_id: customId });
    });

    apiTest('accepts the same id in both the body and the query', async ({ apiClient }) => {
      const customId = `both-id-${uuidv4()}`;

      const res = await addMonitor(
        apiClient,
        editorHeaders,
        { ...newMonitor(), id: customId },
        { id: customId }
      );

      expect(res.body).toMatchObject({ id: customId });
    });

    apiTest('rejects different ids in the body and the query', async ({ apiClient }) => {
      const res = await addMonitor(
        apiClient,
        editorHeaders,
        { ...newMonitor(), id: `body-id-${uuidv4()}` },
        { id: `query-id-${uuidv4()}`, statusCode: 400 }
      );

      expect((res.body as { message: string }).message).toContain('does not match');
    });

    apiTest('generates an id when none is supplied', async ({ apiClient }) => {
      const res = await addMonitor(apiClient, editorHeaders, newMonitor());

      expect((res.body as { id: string }).id).toMatch(/^[0-9a-f-]{36}$/);
    });

    apiTest(
      'returns 409 for an id supplied in the body that already exists, leaving the monitor untouched',
      async ({ apiClient }) => {
        const customId = `conflict-body-${uuidv4()}`;
        const original = { ...newMonitor(), id: customId };
        await addMonitor(apiClient, editorHeaders, original);

        const res = await addMonitor(
          apiClient,
          editorHeaders,
          { ...newMonitor(), id: customId },
          { statusCode: 409 }
        );
        expect((res.body as { message: string }).message).toBe(
          `Monitor with id "${customId}" already exists.`
        );

        const existing = await getMonitor(apiClient, editorHeaders, customId);
        expect(existing.body).toMatchObject({ name: original.name });
      }
    );

    apiTest(
      'returns 409 for an id supplied in the query that already exists',
      async ({ apiClient }) => {
        const customId = `conflict-query-${uuidv4()}`;
        await addMonitor(apiClient, editorHeaders, newMonitor(), { id: customId });

        await addMonitor(apiClient, editorHeaders, newMonitor(), {
          id: customId,
          statusCode: 409,
        });
      }
    );
  }
);
