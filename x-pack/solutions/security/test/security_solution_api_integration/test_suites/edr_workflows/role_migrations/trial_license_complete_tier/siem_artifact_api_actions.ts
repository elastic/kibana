/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type TestAgent from 'supertest/lib/agent';
import type { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { GLOBAL_ARTIFACT_TAG } from '@kbn/security-solution-plugin/common/endpoint/service/artifacts';
import type { ArtifactTestData } from '@kbn/test-suites-xpack-security-endpoint/services/endpoint_artifacts';
import type { CustomRole } from '../../../../config/services/types';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

type ArtifactListsWithRequiredPrivileges = Array<{
  listId: (typeof ENDPOINT_ARTIFACT_LIST_IDS)[number];
  privileges: string[];
}>;

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const endpointArtifactTestResources = getService('endpointArtifactTestResources');

  const formatPrivileges = (privileges: string[]) => privileges.map((p) => `'${p}'`).join(', ');

  describe('@ess @serverless @skipInServerlessMKI Endpoint Artifacts role backwards compatibility', function () {
    const afterEachDataCleanup: Array<Pick<ArtifactTestData, 'cleanup'>> = [];
    const config = getService('config');
    const isServerless = config.get('serverless');

    const SIEM_VERSIONS = ['siem', 'siemV2', 'siemV3', 'siemV4'] as const;

    const createUserWithSiemPrivileges = async (
      siemVersion: (typeof SIEM_VERSIONS)[number],
      siemPrivileges: string[]
    ): Promise<TestAgent> => {
      const customRole: CustomRole = {
        name: `siem_privileges_role_${uuidv4()}`,
        privileges: {
          kibana: [
            {
              base: [],
              feature: {
                [siemVersion]: siemPrivileges,
              },
              spaces: ['*'],
            },
          ],
          elasticsearch: { cluster: [], indices: [] },
        },
      };

      return utils.createSuperTestWithCustomRole(customRole);
    };

    after(async () => {
      await utils.cleanUpCustomRoles();
    });

    afterEach(async () => {
      await Promise.allSettled(afterEachDataCleanup.splice(0).map((data) => data.cleanup()));
    });

    describe('From siemV4', () => {
      const siemVersion = 'siemV4';
      const siemV4ArtifactPrivileges: ArtifactListsWithRequiredPrivileges = [
        {
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
          privileges: ['read', 'endpoint_exceptions_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
          privileges: ['read', 'trusted_applications_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
          privileges: ['read', 'event_filters_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
          privileges: ['read', 'blocklist_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
          privileges: ['read', 'host_isolation_exceptions_all', 'global_artifact_management_all'],
        },

        {
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
          privileges: ['minimal_read', 'endpoint_exceptions_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
          privileges: [
            'minimal_read',
            'trusted_applications_all',
            'global_artifact_management_all',
          ],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
          privileges: ['minimal_read', 'event_filters_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
          privileges: ['minimal_read', 'blocklist_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
          privileges: [
            'minimal_read',
            'host_isolation_exceptions_all',
            'global_artifact_management_all',
          ],
        },
      ];

      for (const { listId, privileges } of siemV4ArtifactPrivileges) {
        it(`should allow creating a global artifact on '${listId}' list with deprecated privileges ${formatPrivileges(
          privileges
        )}`, async () => {
          const supertestGlobalArtifactManager = await createUserWithSiemPrivileges(
            siemVersion,
            privileges
          );

          const createdArtifact = await endpointArtifactTestResources.createArtifact(
            listId,
            { tags: [GLOBAL_ARTIFACT_TAG] },
            { supertest: supertestGlobalArtifactManager }
          );

          afterEachDataCleanup.push(createdArtifact);
        });
      }
    });

    describe('From siemV3: EndpointExceptions migration', () => {
      const siemVersion = 'siemV3';
      const siemV3ArtifactPrivileges: ArtifactListsWithRequiredPrivileges = [
        {
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
          privileges: ['all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
          privileges: ['read', 'trusted_applications_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
          privileges: ['read', 'event_filters_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
          privileges: ['read', 'blocklist_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
          privileges: ['read', 'host_isolation_exceptions_all', 'global_artifact_management_all'],
        },

        {
          listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
          privileges: isServerless
            ? // on serverless, Endpoint Exceptions subfeature privilege existed separately,
              ['minimal_all', 'endpoint_exceptions_all', 'global_artifact_management_all']
            : // while on ESS it was included in `minimal_all`
              ['minimal_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
          privileges: [
            'minimal_read',
            'trusted_applications_all',
            'global_artifact_management_all',
          ],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
          privileges: ['minimal_read', 'event_filters_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
          privileges: ['minimal_read', 'blocklist_all', 'global_artifact_management_all'],
        },
        {
          listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
          privileges: [
            'minimal_read',
            'host_isolation_exceptions_all',
            'global_artifact_management_all',
          ],
        },
      ];

      for (const { listId, privileges } of siemV3ArtifactPrivileges) {
        it(`should allow creating a global artifact on '${listId}' list with deprecated privileges ${formatPrivileges(
          privileges
        )}`, async () => {
          const supertestGlobalArtifactManager = await createUserWithSiemPrivileges(
            siemVersion,
            privileges
          );

          const createdArtifact = await endpointArtifactTestResources.createArtifact(
            listId,
            { tags: [GLOBAL_ARTIFACT_TAG] },
            { supertest: supertestGlobalArtifactManager }
          );

          afterEachDataCleanup.push(createdArtifact);
        });
      }
    });

    describe('From siem/siemV2: GlobalArtifactManagement and EndpointExceptions migration ', () => {
      for (const siemVersion of ['siemV2', 'siem'] as const) {
        describe(`with ${siemVersion} feature version`, () => {
          const artifactTypes: ArtifactListsWithRequiredPrivileges = [
            {
              listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
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
              listId: ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
              privileges: isServerless
                ? // on serverless, Endpoint Exceptions subfeature privilege existed separately,
                  ['minimal_all', 'endpoint_exceptions_all']
                : // while on ESS it was included in `minimal_all`
                  ['minimal_all'],
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

          for (const { listId, privileges } of artifactTypes) {
            it(`should allow creating a global artifact on '${listId}' list with deprecated privileges ${formatPrivileges(
              privileges
            )}`, async () => {
              const supertestGlobalArtifactManager = await createUserWithSiemPrivileges(
                siemVersion,
                privileges
              );

              const createdArtifact = await endpointArtifactTestResources.createArtifact(
                listId,
                { tags: [GLOBAL_ARTIFACT_TAG] },
                { supertest: supertestGlobalArtifactManager }
              );

              afterEachDataCleanup.push(createdArtifact);
            });
          }
        });
      }
    });
  });
}
