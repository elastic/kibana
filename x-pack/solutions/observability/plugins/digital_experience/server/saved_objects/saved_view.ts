/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import { OVERVIEW_KUERY_MAX_LENGTH, OVERVIEW_PERCENTILES } from '../../common/overview_filters';
import { OVERVIEW_FILTERS_PARAM_MAX_LENGTH } from '../../common/overview_filters_param';
import {
  SAVED_VIEW_DESCRIPTION_MAX_LENGTH,
  SAVED_VIEW_NAME_MAX_LENGTH,
  SAVED_VIEW_RANGE_MAX_LENGTH,
  SAVED_VIEW_TYPE,
} from '../../common/saved_views';

const OFFERED_PERCENTILES = OVERVIEW_PERCENTILES.map(String);

/**
 * The attributes of a view, bounded like the params of the routes they are applied through. The
 * filters and the query are kept as the URL holds them, and are checked again when they are used.
 */
const viewAttributesV1 = schema.object({
  name: schema.string({ minLength: 1, maxLength: SAVED_VIEW_NAME_MAX_LENGTH }),
  description: schema.maybe(schema.string({ maxLength: SAVED_VIEW_DESCRIPTION_MAX_LENGTH })),
  filters: schema.maybe(schema.string({ maxLength: OVERVIEW_FILTERS_PARAM_MAX_LENGTH })),
  kuery: schema.maybe(schema.string({ maxLength: OVERVIEW_KUERY_MAX_LENGTH })),
  percentile: schema.maybe(
    schema.string({
      validate: (value) =>
        OFFERED_PERCENTILES.includes(value)
          ? undefined
          : `The percentile is one of ${OFFERED_PERCENTILES.join(', ')}`,
    })
  ),
  rangeFrom: schema.maybe(schema.string({ maxLength: SAVED_VIEW_RANGE_MAX_LENGTH })),
  rangeTo: schema.maybe(schema.string({ maxLength: SAVED_VIEW_RANGE_MAX_LENGTH })),
});

/**
 * A named view of the Overview, shared with everyone who can read the space's views. Nothing is
 * searched or sorted on in Elasticsearch, as a space holds few views and the routes read them
 * whole, so no field is mapped.
 */
export const savedViewSavedObjectType: SavedObjectsType = {
  name: SAVED_VIEW_TYPE,
  hidden: false,
  namespaceType: 'single',
  management: {
    displayName: 'Digital experience view',
    getTitle: (savedObject) => String(savedObject.attributes.name),
    icon: 'save',
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
        forwardCompatibility: viewAttributesV1.extends({}, { unknowns: 'ignore' }),
        create: viewAttributesV1,
      },
    },
  },
};
