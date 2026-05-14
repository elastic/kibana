/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObject } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { StoredCompositeSLODefinition } from '../domain/models';

export const SO_SLO_COMPOSITE_TYPE = 'slo-composite';

const compositeSloAttributesSchema = {
  id: schema.string(),
  name: schema.string(),
  description: schema.string(),
  compositeMethod: schema.string(),
  timeWindow: schema.object({
    duration: schema.string(),
    type: schema.string(),
  }),
  budgetingMethod: schema.string(),
  objective: schema.object({
    target: schema.number(),
  }),
  members: schema.arrayOf(
    schema.object({
      sloId: schema.string(),
      weight: schema.number(),
      instanceId: schema.maybe(schema.string()),
    })
  ),
  tags: schema.arrayOf(schema.string()),
  enabled: schema.boolean(),
  createdAt: schema.string(),
  updatedAt: schema.string(),
  createdBy: schema.string(),
  updatedBy: schema.string(),
  version: schema.number(),
};

export const sloComposite: SavedObjectsType = {
  name: SO_SLO_COMPOSITE_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: schema.object(compositeSloAttributesSchema),
        forwardCompatibility: schema.object(compositeSloAttributesSchema, { unknowns: 'ignore' }),
      },
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
