/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import type { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { inventoryViewSavedObjectRT } from './types';

export const inventoryViewSavedObjectName = 'inventory-view';

const getInventoryViewTitle = (savedObject: SavedObject<unknown>) =>
  pipe(
    inventoryViewSavedObjectRT.decode(savedObject),
    fold(
      () => `Inventory view [id=${savedObject.id}]`,
      ({ attributes: { name } }) => name
    )
  );

const schemaV1 = schema.object({}, { unknowns: 'allow' });
const schemaV2 = schema.object(
  {
    legend: schema.maybe(
      schema.object({ steps: schema.number({ max: 18, min: 2 }) }, { unknowns: 'allow' })
    ),
  },
  { unknowns: 'allow' }
);

export const inventoryViewSavedObjectType: SavedObjectsType = {
  name: inventoryViewSavedObjectName,
  hidden: false,
  namespaceType: 'single',
  management: {
    defaultSearchField: 'name',
    displayName: 'inventory view',
    getTitle: getInventoryViewTitle,
    icon: 'metricsApp',
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: schemaV1,
      },
    },
    2: {
      changes: [
        {
          type: 'unsafe_transform',
          transformFn: (document) => {
            if (document.attributes.legend.steps > 18) {
              document.attributes.legend.steps = 18;
            } else if (document.attributes.legend.steps < 2) {
              document.attributes.legend.steps = 2;
            }
            return { document };
          },
        },
      ],
      schemas: {
        forwardCompatibility: schemaV2,
        create: schemaV2,
      },
    },
  },
};
