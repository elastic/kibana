/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { ENDPOINT_ARTIFACT_LIST_IDS, ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { Role } from '@kbn/security-plugin-types-common';
import { GLOBAL_ARTIFACT_TAG } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common/constants';
import { ArtifactTestData } from '../../../../../security_solution_endpoint/services/endpoint_artifacts';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export const SIEM_VERSIONS = ['siem', 'siemV2', 'siemV3'] as const;

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  describe('@ess @skipInServerless, @skipInServerlessMKI Endpoint Artifacts space awareness user role backwards compatibility until siemV3', function () {
    const afterEachDataCleanup: Array<Pick<ArtifactTestData, 'cleanup'>> = [];

    let globalArtifactManagerRole: Role;
    let supertestGlobalArtifactManager: TestAgent;

    // testing with all SIEM versions for backward compatibility
    for (const siemVersion of SIEM_VERSIONS) {
      describe(`with ${siemVersion} feature version`, () => {
        before(async () => {
          globalArtifactManagerRole = Object.assign(
            rolesUsersProvider.loader.getPreDefinedRole('t1_analyst'),
            { name: 'globalArtifactManager' }
          );

          delete globalArtifactManagerRole.kibana[0].feature[SECURITY_FEATURE_ID];

          globalArtifactManagerRole.kibana[0].feature[siemVersion] = [
            'all', // for Endpoint Exceptions
            'trusted_applications_all',
            'event_filters_all',
            'blocklist_all',
            'host_isolation_exceptions_all',

            // adding global access to current version, old version should receive it during rule migration
            ...(siemVersion === SECURITY_FEATURE_ID ? ['global_artifact_management_all'] : []),
          ];

          rolesUsersProvider.loader.create(globalArtifactManagerRole);

          const globalArtifactManagerUser = await rolesUsersProvider.loader.create(
            globalArtifactManagerRole
          );

          supertestGlobalArtifactManager = await utils.createSuperTest(
            globalArtifactManagerUser.username,
            globalArtifactManagerUser.password
          );
        });

        after(async () => {
          if (globalArtifactManagerRole) {
            await rolesUsersProvider.loader.delete(globalArtifactManagerRole.name);
            // @ts-expect-error
            globalArtifactManagerRole = undefined;
          }
        });

        afterEach(async () => {
          await Promise.allSettled(afterEachDataCleanup.splice(0).map((data) => data.cleanup()));
        });

        const artifactListIds = [...ENDPOINT_ARTIFACT_LIST_IDS, ENDPOINT_LIST_ID] as const;

        for (const artifactListId of artifactListIds) {
          it(`should allow creating a global artifact on ${artifactListId} list`, async () => {
            const createdArtifact = await endpointArtifactTestResources.createArtifact(
              artifactListId,
              { tags: [GLOBAL_ARTIFACT_TAG] },
              { supertest: supertestGlobalArtifactManager }
            );

            afterEachDataCleanup.push(createdArtifact);
          });
        }
      });
    }
  });
}
