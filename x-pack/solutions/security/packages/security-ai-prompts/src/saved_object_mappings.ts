/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const promptSavedObjectType = 'security-ai-prompt';
export const promptSavedObjectMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    description: {
      type: 'text',
    },
    promptId: {
      // represent unique prompt
      type: 'keyword',
    },
    promptGroupId: {
      // represents unique groups of prompts
      type: 'keyword',
    },
    provider: {
      type: 'keyword',
    },
    model: {
      type: 'keyword',
    },
    prompt: {
      properties: {
        // English is default
        default: {
          type: 'text',
        },
        // optionally, add ISO 639 two-letter language code to support more translations
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
