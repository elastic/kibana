/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperties } from './types';

export const BASE_ENTITY_INDEX_MAPPING: MappingProperties = {
  '@timestamp': {
    type: 'date',
  },
  'asset.criticality': {
    type: 'keyword',
  },
  'entity.name': {
    type: 'keyword',
    fields: {
      text: {
        type: 'match_only_text',
      },
    },
  },
  'entity.source': {
    type: 'keyword',
  },
};
