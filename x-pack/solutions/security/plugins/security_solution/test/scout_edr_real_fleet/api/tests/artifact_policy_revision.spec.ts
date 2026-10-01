/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetOnePackagePolicyResponse } from '@kbn/fleet-plugin/common';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import { getEndpointArtifactsApiService, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { HOST_METADATA_GET_ROUTE } from '../../../../common/endpoint/constants';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import type { HostInfo } from '../../../../common/endpoint/types';
import { apiTest } from '../fixtures';

const TRUSTED_APPS_LIST_ID = ENDPOINT_ARTIFACT_LISTS.trustedApps.id;
/**
 * `edr_real_fleet` sets `packagerTaskInterval` to 5s. The host then has to
 * check in and report the applied revision.
 */
const PACKAGER_INTERVAL_MS = 5_000;
/** Three packager ticks with no change, so a bump already queued by enrollment is not the write. */
const STABLE_REVISION_MS = 15_000;
const SETTLE_TIMEOUT_MS = 60_000;
const PACKAGE_POLICY_REVISION_TIMEOUT_MS = 60_000;
const APPLIED_REVISION_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = 12 * 60 * 1000;

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

const waitForStablePackagePolicyRevision = async (read: () => Promise<number>): Promise<number> => {
  let current = await read();
  let stableSince = Date.now();
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => {
      setTimeout(resolve, PACKAGER_INTERVAL_MS);
    });
    const next = await read();
    if (next !== current) {
      current = next;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= STABLE_REVISION_MS) {
      return current;
    }
  }

  throw new Error(`endpoint package policy revision did not settle at ${current}`);
};

const waitForPackagePolicyRevisionAbove = async (
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
        timeout: PACKAGE_POLICY_REVISION_TIMEOUT_MS,
        intervals: [PACKAGER_INTERVAL_MS],
        message: `endpoint package policy revision did not increase past ${current}`,
      }
    )
    .toBeGreaterThan(current);

  return observed;
};

const waitForAppliedRevisionAtLeast = async (
  read: () => Promise<number>,
  minimum: number
): Promise<number> => {
  let observed = 0;
  await expect
    .poll(
      async () => {
        observed = await read();
        return observed;
      },
      {
        timeout: APPLIED_REVISION_TIMEOUT_MS,
        intervals: [PACKAGER_INTERVAL_MS],
        message: `enrolled host applied revision did not reach ${minimum}`,
      }
    )
    .toBeGreaterThanOrEqual(minimum);

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

        const readPackagePolicyRevision = async () => {
          const response = await apiClient.get(
            packagePolicyRouteService.getInfoPath(enrolledEndpoint.packagePolicyId),
            { headers, responseType: 'json' }
          );
          expect(response).toHaveStatusCode(200);
          return (response.body as GetOnePackagePolicyResponse).item.revision;
        };
        const readAppliedRevision = async () => {
          const response = await apiClient.get(
            HOST_METADATA_GET_ROUTE.replace('{id}', enrolledEndpoint.agentId),
            { headers, responseType: 'json' }
          );
          expect(response).toHaveStatusCode(200);
          const body = response.body as HostInfo;
          return Number(body.metadata.Endpoint.policy.applied.endpoint_policy_version);
        };

        const baseline = await waitForStablePackagePolicyRevision(readPackagePolicyRevision);

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
            tags: [GLOBAL_ARTIFACT_TAG],
          },
        });
        expect(createItemResponse).toHaveStatusCode(200);
        const itemId = (createItemResponse.body as { item_id: string }).item_id;
        expect(itemId).toStrictEqual(expect.any(String));

        const revisionAfterCreate = await waitForPackagePolicyRevisionAbove(
          readPackagePolicyRevision,
          baseline
        );
        const appliedAfterCreate = await waitForAppliedRevisionAtLeast(
          readAppliedRevision,
          revisionAfterCreate
        );
        expect(appliedAfterCreate).toBeGreaterThanOrEqual(revisionAfterCreate);

        const deleteResponse = await apiClient.delete(
          `/api/exception_lists/items?item_id=${encodeURIComponent(
            itemId
          )}&namespace_type=agnostic`,
          { headers, responseType: 'json' }
        );
        expect(deleteResponse).toHaveStatusCode(200);

        const revisionAfterDelete = await waitForPackagePolicyRevisionAbove(
          readPackagePolicyRevision,
          revisionAfterCreate
        );
        const appliedAfterDelete = await waitForAppliedRevisionAtLeast(
          readAppliedRevision,
          revisionAfterDelete
        );
        expect(appliedAfterDelete).toBeGreaterThanOrEqual(revisionAfterDelete);
      }
    );
  }
);
