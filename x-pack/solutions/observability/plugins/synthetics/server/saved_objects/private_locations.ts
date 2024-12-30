/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { modelVersion1 } from './migrations/private_locations/model_version_1';
import {
  legacyPrivateLocationsSavedObjectName,
  privateLocationSavedObjectName,
} from '../../common/saved_objects/private_locations';

export const PRIVATE_LOCATION_SAVED_OBJECT_TYPE: SavedObjectsType = {
  name: privateLocationSavedObjectName,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties: {
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      */
    },
  },
  management: {
    importableAndExportable: true,
  },
};

export const legacyPrivateLocationsSavedObjectId = 'synthetics-privates-locations-singleton';

export const LEGACY_PRIVATE_LOCATIONS_SAVED_OBJECT_TYPE: SavedObjectsType = {
  name: legacyPrivateLocationsSavedObjectName,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      */
    },
  },
  management: {
    importableAndExportable: true,
  },
  modelVersions: {
    1: modelVersion1,
  },
};
