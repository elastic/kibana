/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { promptSavedObjectType } from '../../../common/constants';

export const promptSavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    description: {
      type: 'text',
    },
    name: {
      type: 'text',
    },
    version: {
      type: 'long',
    },
    prompt: {
      properties: {
        // ISO 639 two-letter language code
        en: {
          type: 'text',
        },
      },
    },
  },
};

export const promptType: SavedObjectsType = {
  name: promptSavedObjectType,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
  namespaceType: 'agnostic',
  mappings: promptSavedObjectMappings,
};
