/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { referenceDataMocks } from './mocks';
import { ReferenceDataClient } from './reference_data_client';
import {
  REF_DATA_KEY_INITIAL_VALUE,
  REF_DATA_KEYS,
  REFERENCE_DATA_SAVED_OBJECT_TYPE,
} from './constants';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { ReferenceDataItemKey } from './types';

describe('Reference Data Client', () => {
  let soClientMock: ReturnType<typeof savedObjectsClientMock.create>;
  let refDataClient: ReferenceDataClient;

  beforeEach(() => {
    const logger = loggingSystemMock.createLogger();

    soClientMock = savedObjectsClientMock.create();
    refDataClient = new ReferenceDataClient(soClientMock, logger);

    referenceDataMocks.applyMocksToSoClient(soClientMock);
  });

  describe('#get() method', () => {
    it('should return reference data item', async () => {
      await expect(refDataClient.get(REF_DATA_KEYS.orphanResponseActionsSpace)).resolves.toEqual({
        id: REF_DATA_KEYS.orphanResponseActionsSpace,
        metadata: {
          spaceId: '',
        },
        owner: 'EDR',
        type: 'RESPONSE-ACTIONS',
      });
    });

    it('should create the reference data item when it does not exist', async () => {
      soClientMock.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(
        refDataClient.get(REF_DATA_KEYS.spaceAwarenessArtifactMigration)
      ).resolves.toEqual({
        id: REF_DATA_KEYS.spaceAwarenessArtifactMigration,
        metadata: {
          data: {},
          finished: '',
          started: expect.any(String),
          status: 'not-started',
        },
        owner: 'EDR',
        type: 'MIGRATION',
      });

      expect(soClientMock.create).toHaveBeenCalledWith(
        REFERENCE_DATA_SAVED_OBJECT_TYPE,
        {
          id: REF_DATA_KEYS.spaceAwarenessArtifactMigration,
          metadata: {
            data: {},
            finished: '',
            started: expect.any(String),
            status: 'not-started',
          },
          owner: 'EDR',
          type: 'MIGRATION',
        },
        { id: REF_DATA_KEYS.spaceAwarenessArtifactMigration, refresh: 'wait_for' }
      );
    });

    it('should throw error if initial reference data definition is not defined', async () => {
      soClientMock.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(
        refDataClient.get('some-invalid-key' as unknown as ReferenceDataItemKey)
      ).rejects.toThrow(
        'Definition for reference data key [some-invalid-key] not defined. Unable to create it.'
      );
    });
  });

  describe('#update() method', () => {
    it('should update reference data item', async () => {
      const update =
        REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.spaceAwarenessResponseActionsMigration]();

      await expect(
        refDataClient.update(REF_DATA_KEYS.spaceAwarenessResponseActionsMigration, update)
      ).resolves.toEqual(update);
    });

    it('should throw an error is update has an `id` that differs from the ref. data key', async () => {
      const update =
        REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.spaceAwarenessResponseActionsMigration]();
      update.id = 'some-other-id' as unknown as ReferenceDataItemKey;

      await expect(
        refDataClient.update(REF_DATA_KEYS.spaceAwarenessResponseActionsMigration, update)
      ).rejects.toThrow(
        `Updated data \'id\' value [some-other-id] differs from the reference data key provided [${REF_DATA_KEYS.spaceAwarenessResponseActionsMigration}]`
      );
    });
  });

  describe('#delete() method', () => {
    it('should delete a reference data item', async () => {
      await expect(
        refDataClient.delete(REF_DATA_KEYS.spaceAwarenessResponseActionsMigration)
      ).resolves.toBeUndefined();

      expect(soClientMock.delete).toHaveBeenCalledWith(
        REFERENCE_DATA_SAVED_OBJECT_TYPE,
        'SPACE-AWARENESS-RESPONSE-ACTIONS-MIGRATION'
      );
    });

    it('should not fail if item does not exist', async () => {
      soClientMock.delete.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError());

      await expect(
        refDataClient.delete(REF_DATA_KEYS.spaceAwarenessResponseActionsMigration)
      ).resolves.toBeUndefined();
    });
  });
});
