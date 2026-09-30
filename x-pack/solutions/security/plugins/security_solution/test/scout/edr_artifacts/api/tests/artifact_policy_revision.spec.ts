/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetOnePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import { API_VERSIONS, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import { getEndpointArtifactsApiService, tags, type KbnClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { setupFleetForEndpoint } from '../../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import {
  createScoutEndpointPolicy,
  deleteScoutEndpointPolicy,
  getCreatedPackagePolicy,
} from '../../ui/fixtures/endpoint_policy';
import { apiTest } from '../fixtures';

const TRUSTED_APPS_LIST_ID = ENDPOINT_ARTIFACT_LISTS.trustedApps.id;
/**
 * The endpoint artifact packager task defaults to a 60s interval
 * (`packagerTaskInterval` in the Security Solution server config).
 */
const REVISION_TIMEOUT_MS = 150_000;
const SUITE_TIMEOUT_MS = 8 * 60 * 1000;

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

const readPackagePolicyRevision = async (
  kbnClient: KbnClient,
  packagePolicyId: string
): Promise<number> => {
  const { data } = await kbnClient.request<GetOnePackagePolicyResponse>({
    method: 'GET',
    path: packagePolicyRouteService.getInfoPath(packagePolicyId),
    headers: { 'elastic-api-version': API_VERSIONS.public.v1 },
    retries: 0,
  });

  return data.item.revision;
};

const waitForRevision = async (read: () => Promise<number>, expected: number): Promise<void> => {
  await expect
    .poll(read, {
      timeout: REVISION_TIMEOUT_MS,
      intervals: [5_000],
      message: `endpoint package policy revision did not reach ${expected}`,
    })
    .toBe(expected);
};

/** One packager interval, so a bump already queued by setup is not counted as the test write. */
const STABLE_REVISION_MS = 70_000;

const waitForStableRevision = async (read: () => Promise<number>): Promise<void> => {
  let current = await read();
  let stableSince = Date.now();
  const deadline = Date.now() + REVISION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => {
      setTimeout(resolve, 5_000);
    });
    const next = await read();
    if (next !== current) {
      current = next;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= STABLE_REVISION_MS) {
      return;
    }
  }

  throw new Error(`endpoint package policy revision did not settle at ${current}`);
};

apiTest.describe(
  'Endpoint artifact changes bump the package policy revision',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse | undefined;
    let packagePolicyId = '';
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ kbnClient, esClient, log, requestAuth }) => {
      apiTest.setTimeout(SUITE_TIMEOUT_MS);
      const endpointArtifacts = getEndpointArtifactsApiService({ kbnClient, esClient, log });
      const adminApiCredentials = await requestAuth.getApiKey('admin');
      headers = {
        ...adminApiCredentials.apiKeyHeader,
        'kbn-xsrf': 'true',
        'elastic-api-version': '2023-10-31',
        'x-elastic-internal-origin': 'kibana',
      };
      await setupFleetForEndpoint(kbnClient, log);
      await endpointArtifacts.deleteList(TRUSTED_APPS_LIST_ID);
      indexedPolicy = await createScoutEndpointPolicy(
        kbnClient,
        log,
        `scout-artifact-revision-${Date.now()}`
      );
      packagePolicyId = getCreatedPackagePolicy(indexedPolicy).id;
      // Create the empty list before the baseline read. A later item write is
      // what should dispatch a new artifact manifest.
      await endpointArtifacts.createList({
        listId: TRUSTED_APPS_LIST_ID,
        type: ExceptionListTypeEnum.ENDPOINT,
      });
      await waitForStableRevision(() => readPackagePolicyRevision(kbnClient, packagePolicyId));
    });

    apiTest.afterAll(async ({ kbnClient, esClient, log }) => {
      await getEndpointArtifactsApiService({ kbnClient, esClient, log }).deleteList(
        TRUSTED_APPS_LIST_ID
      );
      if (indexedPolicy) {
        await deleteScoutEndpointPolicy(kbnClient, log, indexedPolicy);
      }
    });

    apiTest(
      'creating and deleting a global trusted application bumps the revision',
      async ({ apiClient }) => {
        apiTest.setTimeout(SUITE_TIMEOUT_MS);
        const read = async () => {
          const response = await apiClient.get(
            packagePolicyRouteService.getInfoPath(packagePolicyId),
            {
              headers,
              responseType: 'json',
            }
          );
          expect(response).toHaveStatusCode(200);
          return (response.body as GetOnePackagePolicyResponse).item.revision;
        };
        const baseline = await read();

        const createResponse = await apiClient.post('/api/exception_lists/items', {
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
        expect(createResponse).toHaveStatusCode(200);
        await waitForRevision(read, baseline + 1);

        const deleteResponse = await apiClient.delete(
          `/api/exception_lists?list_id=${TRUSTED_APPS_LIST_ID}&namespace_type=agnostic`,
          { headers, responseType: 'json' }
        );
        expect(deleteResponse).toHaveStatusCode(200);
        await waitForRevision(read, baseline + 2);
      }
    );
  }
);
