/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIConnector, SortDirection } from '@elastic/search-ui';

import { SchemaType, AdvancedSchema } from '../../../../shared/schema/types';

import { Fields } from './types';

export const buildSearchUIConfig = (
  apiConnector: APIConnector,
  schema: AdvancedSchema,
  fields: Fields,
  initialState = { sortDirection: 'desc' as SortDirection, sortField: 'id' }
) => {
  const facets = fields.filterFields
    .filter((fieldName) => !!schema[fieldName] && schema[fieldName].type !== SchemaType.Geolocation)
    .filter((fieldName) => !!schema[fieldName].capabilities.facet)
    .reduce((facetsConfig, fieldName) => {
      return {
        ...facetsConfig,
        [fieldName]: { type: 'value', size: 30 },
      };
    }, {});

  const resultFields = Object.entries(schema)
    .filter(([, schemaField]) => schemaField.type !== SchemaType.Nested)
    .reduce((acc, [fieldName, schemaField]) => {
      if (schemaField.capabilities.snippet) {
        return { ...acc, [fieldName]: { raw: {}, snippet: { size: 300 } } };
      }
      return { ...acc, [fieldName]: { raw: {} } };
    }, {});

  return {
    alwaysSearchOnInitialLoad: true,
    apiConnector,
    trackUrlState: false,
    initialState,
    searchQuery: {
      disjunctiveFacets: Object.keys(facets),
      facets,
      result_fields: resultFields,
    },
  };
};
