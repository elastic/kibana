/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const threatHuntingHypothesesTypeName = 'hypotheses-threat-hunting';

export const threatHuntingHypothesesTypeNameMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    title: { type: 'text' },
    summary: { type: 'text' },
    managed: { type: 'boolean' },
    // where the hypothesis came from: pre_built | ai_generated
    source_type: { type: 'keyword' },
    version: { type: 'keyword' },
    // A selection of the ECS threat fields used by rules
    threat: {
      // NOTE: arrays are fine—ES treats arrays of values/objects implicitly by reusing the same mapping
      properties: {
        framework: { type: 'keyword' }, // e.g., MITRE ATT&CK
        tactic: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'keyword' },
            reference: { type: 'keyword' },
          },
        },
        technique: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'keyword' },
            reference: { type: 'keyword' },
            subtechnique: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'keyword' },
                reference: { type: 'keyword' },
              },
            },
          },
        },
      },
    },
    tags: { type: 'keyword' },
    model: {
      properties: {
        name: { type: 'keyword' },
      },
    },
  },
};

export const threatHuntingHypothesesType: SavedObjectsType = {
  name: threatHuntingHypothesesTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: threatHuntingHypothesesTypeNameMappings,
};
