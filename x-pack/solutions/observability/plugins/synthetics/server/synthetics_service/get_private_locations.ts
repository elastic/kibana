/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { uniqBy } from 'lodash';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
  privateLocationSavedObjectName,
} from '../../common/saved_objects/private_locations';
import type {
  PrivateLocationAttributes,
  SyntheticsPrivateLocationsAttributes,
} from '../runtime_types/private_locations';

export const getPrivateLocations = async (
  client: SavedObjectsClientContract,
  spaceId?: string
): Promise<SyntheticsPrivateLocationsAttributes['locations']> => {
  try {
    const [results, legacyLocations] = await Promise.all([
      getNewPrivateLocations(client, spaceId),
      getLegacyPrivateLocations(client),
    ]);

    return uniqBy([...results, ...legacyLocations], 'id');
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return [];
    }
    throw getErr;
  }
};

const getNewPrivateLocations = async (client: SavedObjectsClientContract, spaceId?: string) => {
  const finder = client.createPointInTimeFinder<PrivateLocationAttributes>({
    type: privateLocationSavedObjectName,
    perPage: 1000,
    ...(spaceId ? { namespaces: [spaceId] } : {}),
  });

  const results: Array<
    SavedObject<PrivateLocationAttributes>['attributes'] & {
      spaces: SavedObject<PrivateLocationAttributes>['namespaces'];
      id: SavedObject<PrivateLocationAttributes>['id'];
    }
  > = [];

  for await (const response of finder.find()) {
    results.push(
      ...response.saved_objects.map((r) => ({ ...r.attributes, id: r.id, spaces: r.namespaces }))
    );
  }

  finder.close().catch((e) => {});
  return results;
};

const getLegacyPrivateLocations = async (client: SavedObjectsClientContract) => {
  try {
    const obj = await client.get<SyntheticsPrivateLocationsAttributes>(
      legacyPrivateLocationsSavedObjectName,
      legacyPrivateLocationsSavedObjectId
    );
    return obj?.attributes.locations ?? [];
  } catch (getErr) {
    return [];
  }
};
