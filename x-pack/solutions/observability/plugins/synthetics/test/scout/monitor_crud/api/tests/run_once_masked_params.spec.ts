/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout-oblt/api';
import type { KibanaRole, ApiClientFixture } from '@kbn/scout-oblt';
import { ConfigKey } from '../../../../../common/runtime_types';
import { MASKED_PARAM_VALUE } from '../../../../../common/utils/mask_monitor_params';
import {
  apiTest,
  mergeSyntheticsApiHeaders,
  PUBLIC_API_VERSION,
  SYNTHETICS_MONITOR_SO_TYPES,
} from '../../../common/fixtures';
import type { ScoutPrivateLocation } from '../../../common/services/synthetics_private_location_api_service';
import {
  deleteMonitors,
  enableSynthetics,
  saveMonitorInternal,
} from '../../../common/fixtures/monitors';
import {
  deletePackagePolicyById,
  getSyntheticsPackagePolicies,
} from '../../../common/fixtures/fleet';
import { tryForTime } from '../../../common/fixtures/retry';
import { browserMonitorFixture } from '../../../common/fixtures/data/browser_monitor';

/** Package policy name assigned to browser run-once configs. */
const BROWSER_TEST_NOW_RUN = 'BROWSER_SYNTHETICS_TEST_NOW_RUN';

const SYNTHETICS_WITHOUT_PARAM_VALUES_ROLE = {
  elasticsearch: { cluster: [], indices: [{ names: ['synthetics-*'], privileges: ['all'] }] },
  kibana: [{ base: [], spaces: ['*'], feature: { uptime: ['all'] } }],
} satisfies KibanaRole;

const SYNTHETICS_WITH_PARAM_VALUES_ROLE = {
  elasticsearch: { cluster: [], indices: [{ names: ['synthetics-*'], privileges: ['all'] }] },
  kibana: [
    {
      base: [],
      spaces: ['*'],
      feature: { uptime: ['all', 'can_read_param_values'] },
    },
  ],
} satisfies KibanaRole;

const monitorPath = (monitorId: string) => `api/synthetics/monitors/${monitorId}?internal=true`;

const getMonitorWithParams = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  monitorId: string
) =>
  apiClient.get(monitorPath(monitorId), {
    headers: { ...headers, 'elastic-api-version': PUBLIC_API_VERSION },
    responseType: 'json',
  });

apiTest.describe(
  'run once restores masked monitor params',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let editorHeaders: Record<string, string>;
    let restrictedHeaders: Record<string, string>;
    let parameterReaderHeaders: Record<string, string>;
    let adminHeaders: Record<string, string>;
    let privateLocation: ScoutPrivateLocation;

    apiTest.beforeAll(async ({ requestAuth, apiClient, apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      const { apiKeyHeader: editorKey } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(editorKey);
      const { apiKeyHeader: restrictedKey } = await requestAuth.getApiKeyForCustomRole(
        SYNTHETICS_WITHOUT_PARAM_VALUES_ROLE
      );
      restrictedHeaders = mergeSyntheticsApiHeaders(restrictedKey);
      const { apiKeyHeader: readerKey } = await requestAuth.getApiKeyForCustomRole(
        SYNTHETICS_WITH_PARAM_VALUES_ROLE
      );
      parameterReaderHeaders = mergeSyntheticsApiHeaders(readerKey);
      const { apiKeyHeader: adminKey } = await requestAuth.getApiKey('admin');
      adminHeaders = mergeSyntheticsApiHeaders(adminKey);
      await enableSynthetics(apiClient, editorHeaders);
      privateLocation = await apiServices.syntheticsPrivateLocations.getSharedPrivateLocation();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    });

    apiTest(
      'uses stored secrets for a user who cannot read parameter values and omits them from the response',
      async ({ apiClient }) => {
        const storedSecret = `stored-secret-${uuidv4()}`;
        const replacement = `visible-note-${uuidv4()}`;
        const originalParams = JSON.stringify({ token: storedSecret });
        const submittedParams = JSON.stringify({
          token: MASKED_PARAM_VALUE,
          note: replacement,
        });
        const name = `mask params run once ${uuidv4()}`;

        const created = await saveMonitorInternal(apiClient, editorHeaders, {
          ...browserMonitorFixture,
          name,
          locations: [privateLocation],
          [ConfigKey.PARAMS]: originalParams,
        });
        const monitorId = created.body.id as string;
        const configId = (created.body.config_id as string) || monitorId;

        const deleteRunOncePolicies = async () => {
          const policies = await getSyntheticsPackagePolicies(apiClient, adminHeaders);
          const runOncePolicies = policies.filter(
            (policy) =>
              policy.name === BROWSER_TEST_NOW_RUN && JSON.stringify(policy).includes(storedSecret)
          );
          for (const policy of runOncePolicies) {
            await deletePackagePolicyById(apiClient, adminHeaders, policy.id);
          }
        };

        try {
          const hidden = await getMonitorWithParams(apiClient, restrictedHeaders, monitorId);
          expect(hidden).toHaveStatusCode(200);
          expect(JSON.stringify(hidden.body)).not.toContain(storedSecret);

          const run = await apiClient.post(
            `internal/synthetics/service/monitors/run_once/${uuidv4()}`,
            {
              headers: restrictedHeaders,
              body: {
                ...browserMonitorFixture,
                name,
                locations: [privateLocation],
                id: configId,
                [ConfigKey.CONFIG_ID]: configId,
                [ConfigKey.PARAMS]: submittedParams,
                // Browser codec requires urls; journey monitors send the empty default.
                [ConfigKey.URLS]: '',
              },
              responseType: 'json',
            }
          );
          expect(run, JSON.stringify(run.body)).toHaveStatusCode(200);
          expect(run.body.errors, JSON.stringify(run.body)).toBeUndefined();
          expect(run.body.params).toBe(submittedParams);
          expect(JSON.stringify(run.body)).not.toContain(storedSecret);

          const testPolicy = await tryForTime(30_000, async () => {
            const policies = await getSyntheticsPackagePolicies(apiClient, adminHeaders);
            const found = policies.find(
              (policy) =>
                policy.name === BROWSER_TEST_NOW_RUN &&
                JSON.stringify(policy).includes(storedSecret) &&
                JSON.stringify(policy).includes(replacement)
            );
            expect(found, 'run-once package policy with restored params').toBeDefined();
            return found;
          });
          expect(JSON.stringify(testPolicy)).toContain(storedSecret);
          expect(JSON.stringify(testPolicy)).toContain(replacement);

          const stored = await getMonitorWithParams(apiClient, parameterReaderHeaders, monitorId);
          expect(stored).toHaveStatusCode(200);
          expect(stored.body.params).toBe(originalParams);
        } finally {
          await deleteRunOncePolicies().catch(() => {});
          await deleteMonitors(apiClient, editorHeaders, [monitorId], { ignoreErrors: true });
        }
      }
    );
  }
);
