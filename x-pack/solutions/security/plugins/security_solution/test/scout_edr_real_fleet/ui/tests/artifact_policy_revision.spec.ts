/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { HOST_METADATA_GET_ROUTE } from '../../../../common/endpoint/constants';
import type { HostInfo } from '../../../../common/endpoint/types';
import { test } from '../fixtures';

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

const readAppliedRevision = async (kbnClient: KbnClient, agentId: string): Promise<number> => {
  const { data } = await kbnClient.request<HostInfo>({
    method: 'GET',
    path: HOST_METADATA_GET_ROUTE.replace('{id}', agentId),
    headers: { 'elastic-api-version': '2023-10-31' },
    retries: 0,
  });

  return Number(data.metadata.Endpoint.policy.applied.endpoint_policy_version);
};

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

test.describe(
  'Endpoint artifact changes on a live host',
  { tag: ['@local-stateful-classic'] },
  () => {
    test.setTimeout(TEST_TIMEOUT_MS);

    test.afterEach(async ({ apiServices }) => {
      await apiServices.endpointArtifacts.deleteList(TRUSTED_APPS_LIST_ID);
    });

    test('creating and deleting a global trusted application bumps the applied revision', async ({
      kbnClient,
      apiServices,
      enrolledEndpoint,
    }) => {
      const read = () => readAppliedRevision(kbnClient, enrolledEndpoint.agentId);
      const baseline = await read();

      await apiServices.endpointArtifacts.createList({
        listId: TRUSTED_APPS_LIST_ID,
        type: ExceptionListTypeEnum.ENDPOINT,
      });
      await apiServices.endpointArtifacts.createItem({
        name: `scout-trusted-app-${Date.now()}`,
        listId: TRUSTED_APPS_LIST_ID,
        entries: TRUSTED_APP_ENTRIES,
        osTypes: ['windows'],
      });

      const afterCreate = await waitForAppliedRevisionAbove(read, baseline);

      await apiServices.endpointArtifacts.deleteList(TRUSTED_APPS_LIST_ID);
      await waitForAppliedRevisionAbove(read, afterCreate);
    });
  }
);
