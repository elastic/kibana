/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
} from '@kbn/securitysolution-list-constants';
import type { RoleApiCredentials } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { setupFleetForEndpoint } from '../../../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { TRUSTED_APP_HASH } from '../../ui/fixtures/artifact_tabs_test_data';
import {
  apiTest,
  createScoutEndpointPolicy,
  deleteScoutEndpointPolicy,
  getCreatedPackagePolicy,
  getPackagePolicyRevision,
  getPolicyManifestArtifactCount,
  tags,
  testData,
} from '../fixtures';

const BLOCKLIST_LIST_ID = ENDPOINT_ARTIFACT_LISTS.blocklists.id;

/**
 * Replaces skipped Cypress artifacts.cy.ts (kibana#168342). That spec needed a
 * live enrolled agent to read applied revision from the endpoints list. The
 * unique Kibana-side contract is: creating an artifact causes the packager
 * task to update the Endpoint package policy (Fleet revision bumps).
 */
apiTest.describe(
  'Endpoint artifacts package policy revision',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let adminCredentials: RoleApiCredentials;
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;
    let packagePolicyId: string;

    apiTest.beforeAll(async ({ requestAuth, kbnClient, log, apiServices }) => {
      apiTest.setTimeout(300_000);

      adminCredentials = await requestAuth.getApiKey('admin');
      await setupFleetForEndpoint(kbnClient, log);
      indexedPolicy = await createScoutEndpointPolicy(
        kbnClient,
        log,
        `Scout artifact revision ${Date.now()}`
      );
      packagePolicyId = getCreatedPackagePolicy(indexedPolicy).id;

      await apiServices.endpointArtifacts.createList({
        listId: BLOCKLIST_LIST_ID,
        type: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
      });
    });

    apiTest.afterAll(async ({ kbnClient, log, apiServices }) => {
      await apiServices.endpointArtifacts.deleteList(BLOCKLIST_LIST_ID);
      if (indexedPolicy) {
        await deleteScoutEndpointPolicy(kbnClient, log, indexedPolicy);
      }
    });

    apiTest(
      'bumps the Endpoint package policy revision after a per-policy artifact is created',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(240_000);

        const revisionBeforeCreate = await getPackagePolicyRevision(
          apiClient,
          packagePolicyId,
          adminCredentials.apiKeyHeader
        );
        const artifactCountBeforeCreate = await getPolicyManifestArtifactCount(
          esClient,
          packagePolicyId
        );

        const createResponse = await apiClient.post(EXCEPTION_LIST_ITEM_URL, {
          headers: {
            ...adminCredentials.apiKeyHeader,
            ...testData.COMMON_HEADERS,
          },
          responseType: 'json',
          body: {
            name: 'Scout blocklist policy revision',
            description: '',
            type: 'simple',
            namespace_type: 'agnostic',
            list_id: BLOCKLIST_LIST_ID,
            os_types: ['windows'],
            tags: [`policy:${packagePolicyId}`],
            entries: [
              {
                field: 'file.hash.sha256',
                value: [TRUSTED_APP_HASH],
                type: 'match_any',
                operator: 'included',
              },
            ],
          },
        });
        expect(createResponse).toHaveStatusCode(200);

        await expect
          .poll(
            async () => {
              const revisionAfterCreate = await getPackagePolicyRevision(
                apiClient,
                packagePolicyId,
                adminCredentials.apiKeyHeader
              );
              const artifactCountAfterCreate = await getPolicyManifestArtifactCount(
                esClient,
                packagePolicyId
              );
              return (
                revisionAfterCreate > revisionBeforeCreate &&
                artifactCountAfterCreate > artifactCountBeforeCreate
              );
            },
            { timeout: 180_000 }
          )
          .toBe(true);
      }
    );
  }
);
