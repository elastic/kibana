/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import {
  ENDPOINT_ARTIFACT_LISTS,
  ENDPOINT_ARTIFACT_LIST_IDS,
  ENDPOINT_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { Role } from '@kbn/security-plugin-types-common';
import { GLOBAL_ARTIFACT_TAG } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common/constants';
import { ArtifactTestData } from '../../../../../security_solution_endpoint/services/endpoint_artifacts';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const rolesUsersProvider = getService('rolesUsersProvider');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  describe('@ess @skipInServerless, @skipInServerlessMKI Endpoint Artifacts space awareness user role backwards compatibility until siemV3', function () {
    const afterEachDataCleanup: Array<Pick<ArtifactTestData, 'cleanup'>> = [];

    const SIEM_VERSIONS = ['siem', 'siemV2', 'siemV3'] as const;

    let globalArtifactManagerRole: Role;

    const createUserWithSiemPrivileges = async (
      siemVersion: (typeof SIEM_VERSIONS)[number],
      siemPrivileges: string[]
    ): Promise<TestAgent> => {
      globalArtifactManagerRole = Object.assign(
        rolesUsersProvider.loader.getPreDefinedRole('t1_analyst'),
        { name: 'globalArtifactManager' }
      );

      // remove actual siem
      delete globalArtifactManagerRole.kibana[0].feature[SECURITY_FEATURE_ID];

      // add (deprecated) siem feature
      globalArtifactManagerRole.kibana[0].feature[siemVersion] = siemPrivileges;

      rolesUsersProvider.loader.create(globalArtifactManagerRole);
      const globalArtifactManagerUser = await rolesUsersProvider.loader.create(
        globalArtifactManagerRole
      );

      return utils.createSuperTest(
        globalArtifactManagerUser.username,
        globalArtifactManagerUser.password
      );
    };

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

    // testing with all SIEM versions for backward compatibility
    for (const siemVersion of SIEM_VERSIONS) {
      describe(`with ${siemVersion} feature version`, () => {
        const artifactTypes: Array<{
          listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number] | typeof ENDPOINT_LIST_ID;
          privileges: string[];
        }> = [
          {
            listId: ENDPOINT_LIST_ID,
            privileges: ['all'],
          },
          {
            listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
            privileges: ['read', 'trusted_applications_all'],
          },
          {
            listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
            privileges: ['read', 'event_filters_all'],
          },
          {
            listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
            privileges: ['read', 'blocklist_all'],
          },
          {
            listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
            privileges: ['read', 'host_isolation_exceptions_all'],
          },

          {
            listId: ENDPOINT_LIST_ID,
            privileges: ['minimal_all'],
          },
          {
            listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
            privileges: ['minimal_read', 'trusted_applications_all'],
          },
          {
            listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
            privileges: ['minimal_read', 'event_filters_all'],
          },
          {
            listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
            privileges: ['minimal_read', 'blocklist_all'],
          },
          {
            listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
            privileges: ['minimal_read', 'host_isolation_exceptions_all'],
          },
        ];

        for (const artifactType of artifactTypes) {
          it(`should allow creating a global artifact on ${
            artifactType.listId
          } list with original privileges ${artifactType.privileges.join(', ')}`, async () => {
            const supertestGlobalArtifactManager = await createUserWithSiemPrivileges(siemVersion, [
              ...artifactType.privileges,

              // adding global access to current version, old version should receive it during rule migration
              ...(siemVersion === SECURITY_FEATURE_ID ? ['global_artifact_management_all'] : []),
            ]);

            const createdArtifact = await endpointArtifactTestResources.createArtifact(
              artifactType.listId,
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
