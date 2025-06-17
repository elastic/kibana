/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../mocks';
import type { MigrationStateReferenceData } from './space_awareness_migration';
import {
  ARTIFACTS_MIGRATION_REF_DATA_ID,
  NOT_FOUND_VALUE,
  RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID,
  migrateEndpointDataToSupportSpaces,
} from './space_awareness_migration';
import { ExceptionsListItemGenerator } from '../../../common/endpoint/data_generators/exceptions_list_item_generator';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { REFERENCE_DATA_SAVED_OBJECT_TYPE } from '../lib/reference_data';
import { GLOBAL_ARTIFACT_TAG } from '../../../common/endpoint/service/artifacts';
import { buildSpaceOwnerIdTag } from '../../../common/endpoint/service/artifacts/utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { EndpointActionGenerator } from '../../../common/endpoint/data_generators/endpoint_action_generator';
import { applyEsClientSearchMock } from '../mocks/utils.mock';
import { ENDPOINT_ACTIONS_INDEX } from '../../../common/endpoint/constants';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { AgentClient } from '@kbn/fleet-plugin/server';
import { FleetAgentGenerator } from '../../../common/endpoint/data_generators/fleet_agent_generator';
import { FleetPackagePolicyGenerator } from '../../../common/endpoint/data_generators/fleet_package_policy_generator';
import type { LogsEndpointAction, PolicyData } from '../../../common/endpoint/types';
import type { Agent } from '@kbn/fleet-plugin/common';

describe('Space awareness migration', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;
  let migrationsState: {
    'SPACE-AWARENESS-ARTIFACT-MIGRATION': MigrationStateReferenceData;
    'SPACE-AWARENESS-RESPONSE-ACTIONS-MIGRATION': MigrationStateReferenceData;
  };

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();
    // @ts-expect-error
    endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;
    migrationsState = {
      [ARTIFACTS_MIGRATION_REF_DATA_ID]: {
        id: ARTIFACTS_MIGRATION_REF_DATA_ID,
        type: 'MIGRATION',
        owner: 'EDR',
        metadata: {
          started: '',
          finished: '',
          status: 'not-started',
        },
      },
      [RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID]: {
        id: RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID,
        type: 'MIGRATION',
        owner: 'EDR',
        metadata: {
          started: '',
          finished: '',
          status: 'not-started',
        },
      },
    };

    const soClientMock =
      endpointServiceMock.savedObjects.createInternalScopedSoClient() as jest.Mocked<SavedObjectsClientContract>;

    // @ts-expect-error
    soClientMock.get.mockImplementation(async (type, id) => {
      if (type === REFERENCE_DATA_SAVED_OBJECT_TYPE) {
        return { attributes: migrationsState[id as keyof typeof migrationsState] };
      }

      return { attributes: {} };
    });
    // @ts-expect-error
    soClientMock.update.mockImplementation(async (type, _id, update) => {
      if (type === REFERENCE_DATA_SAVED_OBJECT_TYPE) {
        return { attributes: update };
      }

      return { attributes: {} };
    });
  });

  it('should do nothing if feature flag is disabled', async () => {
    // @ts-expect-error
    endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = false;

    await expect(migrateEndpointDataToSupportSpaces(endpointServiceMock)).resolves.toBeUndefined();
    expect(endpointServiceMock.getInternalFleetServices).not.toHaveBeenCalled();
    expect(endpointServiceMock.getInternalEsClient).not.toHaveBeenCalled();
  });

  describe('for Artifacts', () => {
    let artifactMigrationState: MigrationStateReferenceData;

    beforeEach(() => {
      artifactMigrationState = migrationsState[ARTIFACTS_MIGRATION_REF_DATA_ID];
      migrationsState[RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID].metadata.status = 'complete';

      const exceptionsGenerator = new ExceptionsListItemGenerator('seed');

      const exceptionsClient = endpointServiceMock.getExceptionListsClient();
      (endpointServiceMock.getExceptionListsClient as jest.Mock).mockClear();

      (exceptionsClient.findExceptionListsItemPointInTimeFinder as jest.Mock).mockImplementation(
        async (options) => {
          const executeFunctionOnStream = options.executeFunctionOnStream;

          return Promise.resolve().then(() => {
            executeFunctionOnStream({
              page: 1,
              total: 2,
              per_page: 10,
              data: [exceptionsGenerator.generateTrustedApp({ tags: [GLOBAL_ARTIFACT_TAG] })],
            });
          });
        }
      );
    });

    it.each(['complete', 'pending'])(
      'should do nothing if migration state is `%s`',
      async (migrationStatus) => {
        artifactMigrationState.metadata.status =
          migrationStatus as typeof artifactMigrationState.metadata.status;

        await expect(
          migrateEndpointDataToSupportSpaces(endpointServiceMock)
        ).resolves.toBeUndefined();
        expect(endpointServiceMock.getExceptionListsClient).not.toHaveBeenCalled();
      }
    );

    it('should query for artifacts for all artifact types', async () => {
      await expect(
        migrateEndpointDataToSupportSpaces(endpointServiceMock)
      ).resolves.toBeUndefined();
      expect(
        endpointServiceMock.getExceptionListsClient().findExceptionListsItemPointInTimeFinder
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          executeFunctionOnStream: expect.any(Function),
          listId: [
            'endpoint_trusted_apps',
            'endpoint_event_filters',
            'endpoint_host_isolation_exceptions',
            'endpoint_blocklists',
            'endpoint_list',
          ],
          namespaceType: ['agnostic', 'agnostic', 'agnostic', 'agnostic', 'agnostic'],
          filter: [
            `NOT exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag('*')}"`,
            `NOT exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag('*')}"`,
            `NOT exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag('*')}"`,
            `NOT exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag('*')}"`,
            `NOT exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag('*')}"`,
          ],
        })
      );
    });

    it('should update artifacts with `ownerSpaceId` tag', async () => {
      await expect(
        migrateEndpointDataToSupportSpaces(endpointServiceMock)
      ).resolves.toBeUndefined();
      expect(
        endpointServiceMock.getExceptionListsClient().updateExceptionListItem
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [GLOBAL_ARTIFACT_TAG, buildSpaceOwnerIdTag(DEFAULT_SPACE_ID)],
        })
      );
    });

    it('should update migration state after completion', async () => {
      await expect(
        migrateEndpointDataToSupportSpaces(endpointServiceMock)
      ).resolves.toBeUndefined();

      expect(
        endpointServiceMock.savedObjects.createInternalScopedSoClient().update
      ).toHaveBeenCalledWith(
        REFERENCE_DATA_SAVED_OBJECT_TYPE,
        ARTIFACTS_MIGRATION_REF_DATA_ID,
        expect.objectContaining({ metadata: expect.objectContaining({ status: 'complete' }) }),
        expect.anything()
      );
    });
  });

  describe('for Response Actions', () => {
    let actionsMigrationState: MigrationStateReferenceData;
    let data: {
      action: LogsEndpointAction;
      agent: Agent;
      packagePolicy: PolicyData;
    };

    beforeEach(() => {
      actionsMigrationState = migrationsState[RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID];
      migrationsState[ARTIFACTS_MIGRATION_REF_DATA_ID].metadata.status = 'complete';
      data = {
        action: new EndpointActionGenerator('seed').generate(),
        agent: new FleetAgentGenerator('seed').generate(),
        packagePolicy: new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy(),
      };

      const esClientMock = endpointServiceMock.getInternalEsClient() as ElasticsearchClientMock;
      let responseHasBeenProvided = false;

      applyEsClientSearchMock({
        esClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        pitUsage: true,
        response: () => {
          if (!responseHasBeenProvided) {
            responseHasBeenProvided = true;
            return EndpointActionGenerator.toEsSearchResponse([
              EndpointActionGenerator.toEsSearchHit(data.action),
            ]);
          }

          return EndpointActionGenerator.toEsSearchResponse([]);
        },
      });

      esClientMock.bulk.mockResolvedValue({ errors: false, items: [], took: 1 });

      const fleetServices = endpointServiceMock.getInternalFleetServices();
      const agentClientMock = fleetServices.agent as jest.Mocked<AgentClient>;

      agentClientMock.getAgent.mockResolvedValue(data.agent);

      (fleetServices.packagePolicy.list as jest.Mock).mockResolvedValue({
        items: [data.packagePolicy],
      });
    });

    it.each(['complete', 'pending'])(
      'should do nothing if migration state is `%s`',
      async (migrationStatus) => {
        actionsMigrationState.metadata.status =
          migrationStatus as typeof actionsMigrationState.metadata.status;

        await expect(
          migrateEndpointDataToSupportSpaces(endpointServiceMock)
        ).resolves.toBeUndefined();
        expect(endpointServiceMock.getExceptionListsClient).not.toHaveBeenCalled();
      }
    );

    it('should query response actions looking for records that do NOT have a `originSpaceId`', async () => {
      await expect(
        migrateEndpointDataToSupportSpaces(endpointServiceMock)
      ).resolves.toBeUndefined();

      expect(endpointServiceMock.getInternalEsClient().search).toHaveBeenCalledWith(
        expect.objectContaining({
          pit: expect.any(Object),
          sort: '@timestamp',
          size: 50,
          query: { bool: { must_not: { exists: { field: 'originSpaceId' } } } },
        })
      );
    });

    it('should update response action with expected new fields', async () => {
      await expect(
        migrateEndpointDataToSupportSpaces(endpointServiceMock)
      ).resolves.toBeUndefined();
      expect(endpointServiceMock.getInternalEsClient().bulk).toHaveBeenCalledWith({
        operations: [
          { update: { _id: expect.any(String), _index: expect.any(String) } },
          {
            doc: {
              agent: {
                policy: [
                  {
                    agentId: (data.action.agent.id as string[])[0],
                    elasticAgentId: (data.action.agent.id as string[])[0],
                    agentPolicyId: data.agent.policy_id,
                    integrationPolicyId: data.packagePolicy.id,
                  },
                ],
              },
              originSpaceId: 'default',
            },
          },
        ],
      });
    });

    it('should handle case where agent is no longer enrolled', async () => {
      (endpointServiceMock.getInternalFleetServices().agent.getAgent as jest.Mock).mockReturnValue(
        Promise.reject(new Error('not found'))
      );
      await expect(
        migrateEndpointDataToSupportSpaces(endpointServiceMock)
      ).resolves.toBeUndefined();
      expect(endpointServiceMock.getInternalEsClient().bulk).toHaveBeenCalledWith({
        operations: [
          { update: { _id: expect.any(String), _index: expect.any(String) } },
          {
            doc: {
              agent: {
                policy: [
                  {
                    agentId: (data.action.agent.id as string[])[0],
                    elasticAgentId: (data.action.agent.id as string[])[0],
                    agentPolicyId: NOT_FOUND_VALUE,
                    integrationPolicyId: NOT_FOUND_VALUE,
                  },
                ],
              },
              originSpaceId: 'default',
            },
          },
        ],
      });
    });

    it('should handle case where integration policy might not exist', async () => {
      (
        endpointServiceMock.getInternalFleetServices().packagePolicy.list as jest.Mock
      ).mockResolvedValue({ items: [] });

      await expect(
        migrateEndpointDataToSupportSpaces(endpointServiceMock)
      ).resolves.toBeUndefined();
      expect(endpointServiceMock.getInternalEsClient().bulk).toHaveBeenCalledWith({
        operations: [
          { update: { _id: expect.any(String), _index: expect.any(String) } },
          {
            doc: {
              agent: {
                policy: [
                  {
                    agentId: (data.action.agent.id as string[])[0],
                    elasticAgentId: (data.action.agent.id as string[])[0],
                    agentPolicyId: data.agent.policy_id,
                    integrationPolicyId: NOT_FOUND_VALUE,
                  },
                ],
              },
              originSpaceId: 'default',
            },
          },
        ],
      });
    });

    it('should update migration state after completion', async () => {
      await expect(
        migrateEndpointDataToSupportSpaces(endpointServiceMock)
      ).resolves.toBeUndefined();
      expect(
        endpointServiceMock.savedObjects.createInternalScopedSoClient().update
      ).toHaveBeenCalledWith(
        REFERENCE_DATA_SAVED_OBJECT_TYPE,
        RESPONSE_ACTIONS_MIGRATION_REF_DATA_ID,
        expect.objectContaining({ metadata: expect.objectContaining({ status: 'complete' }) }),
        expect.anything()
      );
    });
  });
});
