/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { getPrivateLocations } from './get_private_locations';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
} from '../../common/saved_objects/private_locations';

describe('getPrivateLocations', () => {
  it('surfaces isAgentSharding from saved object attributes', async () => {
    const savedObjectsClient = {
      createPointInTimeFinder: () => ({
        async *find() {
          yield {
            saved_objects: [
              {
                id: 'loc-1',
                namespaces: ['default'],
                attributes: {
                  label: 'Loc',
                  id: 'loc-1',
                  agentPolicyId: 'ap-1',
                  isServiceManaged: false,
                  isAgentSharding: true,
                },
              },
            ],
          };
        },
        close: async () => undefined,
      }),
      get: jest
        .fn()
        .mockRejectedValue(
          SavedObjectsErrorHelpers.createGenericNotFoundError(
            legacyPrivateLocationsSavedObjectName,
            legacyPrivateLocationsSavedObjectId
          )
        ),
    };

    const locations = await getPrivateLocations(savedObjectsClient as any);

    expect(locations).toEqual([
      expect.objectContaining({
        id: 'loc-1',
        isAgentSharding: true,
        spaces: ['default'],
      }),
    ]);
  });
});
