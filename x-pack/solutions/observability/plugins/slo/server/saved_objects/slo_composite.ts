/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObject } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { COMPOSITE_SLO_MAX_MEMBERS, COMPOSITE_SLO_MIN_MEMBERS } from '@kbn/slo-schema';
import type { StoredCompositeSLODefinition } from '../domain/models';

export const SO_SLO_COMPOSITE_TYPE = 'slo-composite';

const compositeSloAttributesSchema = {
  id: schema.string({ maxLength: 64 }),
  name: schema.string({ maxLength: 256 }),
  description: schema.string({ maxLength: 2048 }),
  compositeMethod: schema.string({ maxLength: 64 }),
  timeWindow: schema.object({
    duration: schema.string({ maxLength: 32 }),
    type: schema.string({ maxLength: 64 }),
  }),
  budgetingMethod: schema.string({ maxLength: 64 }),
  objective: schema.object({
    target: schema.number(),
  }),
  members: schema.arrayOf(
    schema.object({
      sloId: schema.string({ maxLength: 64 }),
      weight: schema.number(),
      instanceId: schema.maybe(schema.string({ maxLength: 512 })),
    }),
    { minSize: COMPOSITE_SLO_MIN_MEMBERS, maxSize: COMPOSITE_SLO_MAX_MEMBERS }
  ),
  tags: schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 30 }),
  enabled: schema.boolean(),
  createdAt: schema.string({ maxLength: 64 }),
  updatedAt: schema.string({ maxLength: 64 }),
  createdBy: schema.string({ maxLength: 256 }),
  updatedBy: schema.string({ maxLength: 256 }),
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
      id: { type: 'keyword', ignore_above: 256 },
      name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
      description: { type: 'text' },
      members: {
        properties: {
          sloId: { type: 'keyword', ignore_above: 256 },
          instanceId: { type: 'keyword', ignore_above: 256 },
        },
      },
      compositeMethod: { type: 'keyword', ignore_above: 256 },
      budgetingMethod: { type: 'keyword', ignore_above: 256 },
      enabled: { type: 'boolean' },
      tags: { type: 'keyword', ignore_above: 256 },
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
