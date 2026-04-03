/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObject } from '@kbn/core/server';
import type { StoredCompositeSLODefinition } from '../domain/models';

export const SO_SLO_COMPOSITE_TYPE = 'slo-composite';

export const sloComposite: SavedObjectsType = {
  name: SO_SLO_COMPOSITE_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  modelVersions: {
    1: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            id: { type: 'keyword' },
            name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            description: { type: 'text' },
            compositeMethod: { type: 'keyword' },
            budgetingMethod: { type: 'keyword' },
            enabled: { type: 'boolean' },
            tags: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            members: {
              properties: {
                sloId: { type: 'keyword' },
                weight: { type: 'float' },
                instanceId: { type: 'keyword' },
              },
            },
          },
        },
      ],
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      description: { type: 'text' },
      members: {
        properties: {
          sloId: { type: 'keyword' },
          weight: { type: 'float' },
          instanceId: { type: 'keyword' },
        },
      },
      compositeMethod: { type: 'keyword' },
      budgetingMethod: { type: 'keyword' },
      enabled: { type: 'boolean' },
      tags: { type: 'keyword' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
  management: {
    displayName: 'Composite SLO',
    importableAndExportable: false,
    getTitle(compositeSloSavedObject: SavedObject<StoredCompositeSLODefinition>) {
      return `Composite SLO: [${compositeSloSavedObject.attributes.name}]`;
    },
  },
};
