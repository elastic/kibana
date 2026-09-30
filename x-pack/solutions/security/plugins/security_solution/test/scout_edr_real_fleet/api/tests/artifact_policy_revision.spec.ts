/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEndpointArtifactsApiService, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { HOST_METADATA_GET_ROUTE } from '../../../../common/endpoint/constants';
import type { HostInfo } from '../../../../common/endpoint/types';
import { apiTest } from '../fixtures';

const TRUSTED_APPS_LIST_ID = ENDPOINT_ARTIFACT_LISTS.trustedApps.id;
/**
 * Packager interval is 60s, then the enrolled agent has to check in and
 * report the new applied revision.
 */
const APPLIED_REVISION_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 10 * 60 * 1000;

const TRUSTED_APP_ENTRIES = [
  {
    entries: [
      {
        field: 'trusted',
        operator: 'included',
        type: 'match',
        value: 'true',
      },
      {
        field: 'subject_name',
        operator: 'included',
        type: 'match',
        value: 'abcd',
      },
    ],
    field: 'process.Ext.code_signature',
    type: 'nested',
  },
];

const waitForAppliedRevisionAbove = async (
  read: () => Promise<number>,
  current: number
): Promise<number> => {
  let observed = current;
  await expect
    .poll(
      async () => {
        observed = await read();
        return observed;
      },
      {
        timeout: APPLIED_REVISION_TIMEOUT_MS,
        intervals: [5_000],
        message: `enrolled host applied revision did not increase past ${current}`,
      }
    )
    .toBeGreaterThan(current);

  return observed;
};

apiTest.describe(
  'Endpoint artifact changes on a live host',
  { tag: ['@local-stateful-classic'] },
  () => {
    apiTest.afterEach(async ({ kbnClient, esClient, log }) => {
      await getEndpointArtifactsApiService({ kbnClient, esClient, log }).deleteList(
        TRUSTED_APPS_LIST_ID
      );
    });

    apiTest(
      'creating and deleting a global trusted application bumps the applied revision',
      async ({ apiClient, enrolledEndpoint, requestAuth }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);
        const adminApiCredentials = await requestAuth.getApiKey('admin');
        const headers = {
          ...adminApiCredentials.apiKeyHeader,
          'kbn-xsrf': 'true',
          ...PUBLIC_API_HEADERS,
        };

        const read = async () => {
          const response = await apiClient.get(
            HOST_METADATA_GET_ROUTE.replace('{id}', enrolledEndpoint.agentId),
            { headers, responseType: 'json' }
          );
          expect(response).toHaveStatusCode(200);
          const body = response.body as HostInfo;
          return Number(body.metadata.Endpoint.policy.applied.endpoint_policy_version);
        };
        const baseline = await read();

        const createListResponse = await apiClient.post('/api/exception_lists', {
          headers,
          responseType: 'json',
          body: {
            name: TRUSTED_APPS_LIST_ID,
            description: 'Scout endpoint artifact list',
            list_id: TRUSTED_APPS_LIST_ID,
            type: ExceptionListTypeEnum.ENDPOINT,
            namespace_type: 'agnostic',
          },
        });
        expect(createListResponse).toHaveStatusCode({ oneOf: [200, 409] });

        const createItemResponse = await apiClient.post('/api/exception_lists/items', {
          headers,
          responseType: 'json',
          body: {
            name: `scout-trusted-app-${Date.now()}`,
            description: '',
            type: 'simple',
            namespace_type: 'agnostic',
            list_id: TRUSTED_APPS_LIST_ID,
            entries: TRUSTED_APP_ENTRIES,
            os_types: ['windows'],
          },
        });
        expect(createItemResponse).toHaveStatusCode(200);

        const afterCreate = await waitForAppliedRevisionAbove(read, baseline);
        expect(afterCreate).toBeGreaterThan(baseline);

        const deleteResponse = await apiClient.delete(
          `/api/exception_lists?list_id=${TRUSTED_APPS_LIST_ID}&namespace_type=agnostic`,
          { headers, responseType: 'json' }
        );
        expect(deleteResponse).toHaveStatusCode(200);

        const afterDelete = await waitForAppliedRevisionAbove(read, afterCreate);
        expect(afterDelete).toBeGreaterThan(afterCreate);
      }
    );
  }
);
