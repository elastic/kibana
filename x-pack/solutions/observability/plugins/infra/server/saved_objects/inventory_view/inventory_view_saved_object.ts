/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { fold } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import type { SavedObject, SavedObjectsType } from '@kbn/core/server';
import type {
  SavedObjectModelTransformationDoc,
  SavedObjectModelUnsafeTransformFn,
} from '@kbn/core-saved-objects-server';
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

type V1 = TypeOf<typeof schemaV1>;
type V2 = TypeOf<typeof schemaV2>;

const inventoryV2Transform: SavedObjectModelUnsafeTransformFn<V1, V2> = (doc) => {
  // steps property did exist, even though it wasn't present in the schema
  const asV2 = doc as SavedObjectModelTransformationDoc<V2>;

  if (typeof asV2.attributes.legend?.steps === 'undefined') {
    return { document: asV2 };
  } else {
    let steps = asV2.attributes.legend?.steps;
    if (steps > 18) {
      steps = 18;
    } else if (steps < 2) {
      steps = 2;
    }

    const document: SavedObjectModelTransformationDoc<V2> = {
      ...asV2,
      attributes: {
        ...asV2.attributes,
        legend: {
          ...asV2.attributes.legend,
          steps,
        },
      },
    };
    return { document };
  }
};

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
          transformFn: (typeSafeGuard) => typeSafeGuard(inventoryV2Transform),
        },
      ],
      schemas: {
        forwardCompatibility: schemaV2,
        create: schemaV2,
      },
    },
  },
};
