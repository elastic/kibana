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
  migrateEndpointDataToSupportSpaces,
} from './space_awareness_migration';
import { ExceptionsListItemGenerator } from '../../../common/endpoint/data_generators/exceptions_list_item_generator';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { REFERENCE_DATA_SAVED_OBJECT_TYPE } from '../lib/reference_data';
import { GLOBAL_ARTIFACT_TAG } from '../../../common/endpoint/service/artifacts';
import { buildSpaceOwnerIdTag } from '../../../common/endpoint/service/artifacts/utils';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

describe('Space awareness migration', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;
  let migrationState: MigrationStateReferenceData;

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();
    // @ts-expect-error
    endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;
    migrationState = {
      id: 'some id',
      type: 'MIGRATION',
      owner: 'EDR',
      metadata: {
        started: '',
        finished: '',
        status: 'not-started',
      },
    };

    const soClientMock =
      endpointServiceMock.savedObjects.createInternalScopedSoClient() as jest.Mocked<SavedObjectsClientContract>;

    soClientMock.get.mockImplementation(async (type) => {
      if (type === REFERENCE_DATA_SAVED_OBJECT_TYPE) {
        return { attributes: migrationState };
      }

      return { attributes: {} };
    });
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
    let exceptionsGenerator: ExceptionsListItemGenerator;

    beforeEach(() => {
      migrationState.id = ARTIFACTS_MIGRATION_REF_DATA_ID;
      exceptionsGenerator = new ExceptionsListItemGenerator('seed');

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
        migrationState.metadata.status = migrationStatus as typeof migrationState.metadata.status;

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
    it.todo('should do nothing if migration state is either `complete` or `pending`');

    it.todo('should query response actions looking for records that do NOT have a `originSpaceId`');

    it.todo('should update response action with expected new fields');

    it.todo('should handle case where agent is no longer enrolled');

    it.todo(`should handle 3rd party response actions`);

    it.todo('should handle case where agent policy might not exist');

    it.todo('should handle case where integration policy might not exist');

    it.todo('should update migration state after completion');
  });
});
