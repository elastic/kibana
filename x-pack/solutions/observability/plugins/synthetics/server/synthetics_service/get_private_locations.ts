/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { uniqBy } from 'lodash';
import {
  legacyPrivateLocationsSavedObjectId,
  legacyPrivateLocationsSavedObjectName,
  privateLocationSavedObjectName,
} from '../../common/saved_objects/private_locations';
import {
  PrivateLocationAttributes,
  SyntheticsPrivateLocationsAttributes,
} from '../runtime_types/private_locations';

export const getPrivateLocations = async (
  client: SavedObjectsClientContract
): Promise<SyntheticsPrivateLocationsAttributes['locations']> => {
  try {
    const [results, legacyLocations] = await Promise.all([
      getNewPrivateLocations(client),
      getLegacyPrivateLocations(client),
    ]);

    return uniqBy(
      [
        ...results.map((r) => ({ ...r.attributes, spaces: r.namespaces, id: r.id })),
        ...legacyLocations,
      ],
      'id'
    );
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return [];
    }
    throw getErr;
  }
};

const getNewPrivateLocations = async (client: SavedObjectsClientContract) => {
  const finder = client.createPointInTimeFinder<PrivateLocationAttributes>({
    type: privateLocationSavedObjectName,
    perPage: 1000,
  });

  const results: Array<SavedObject<PrivateLocationAttributes>> = [];

  for await (const response of finder.find()) {
    results.push(...response.saved_objects);
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
