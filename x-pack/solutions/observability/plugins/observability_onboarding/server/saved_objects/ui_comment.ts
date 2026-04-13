/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const UI_COMMENT_SAVED_OBJECT_TYPE = 'observability-onboarding-ui-comment';

export const uiComment: SavedObjectsType = {
  name: UI_COMMENT_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      clientX: { type: 'integer' },
      clientY: { type: 'integer' },
      elemWidth: { type: 'integer' },
      elemHeight: { type: 'integer' },
      selector: { type: 'keyword' },
      text: { type: 'text' },
      author: { type: 'keyword' },
      createdAt: { type: 'date' },
      resolved: { type: 'boolean' },
      replies: { type: 'object', dynamic: false },
      pathname: { type: 'keyword' },
      floatingAnchor: { type: 'boolean' },
    },
  },
  modelVersions: {
    1: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            elemWidth: { type: 'integer' },
            elemHeight: { type: 'integer' },
            selector: { type: 'keyword' },
          },
        },
      ],
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            floatingAnchor: { type: 'boolean' },
          },
        },
      ],
    },
  },
};
