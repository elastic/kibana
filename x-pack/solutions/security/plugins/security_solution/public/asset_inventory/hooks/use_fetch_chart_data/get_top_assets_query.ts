/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_FIELDS } from '../../constants';
import type { UseTopAssetsOptions } from './types';
import { getMultiFieldsSort } from '../fetch_utils';
import { addEmptyDataFilterQuery } from '../../utils/add_empty_data_filter';

export const getTopAssetsQuery = ({ query, sort }: UseTopAssetsOptions, indexPattern?: string) => {
  if (!indexPattern) {
    throw new Error('Index pattern is required');
  }

  return {
    size: 0,
    index: indexPattern,
    aggs: {
      entityType: {
        terms: {
          field: ASSET_FIELDS.ENTITY_TYPE,
          order: { entityId: 'desc' },
          size: 10,
        },
        aggs: {
          entitySubType: {
            terms: {
              field: ASSET_FIELDS.ENTITY_SUB_TYPE,
              order: { entityId: 'desc' },
              size: 10,
            },
            aggs: {
              entityId: {
                value_count: {
                  field: ASSET_FIELDS.ENTITY_ID,
                },
              },
            },
          },
          entityId: {
            value_count: {
              field: ASSET_FIELDS.ENTITY_ID,
            },
          },
        },
      },
    },
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [...(query?.bool?.filter ?? [])],
        should: [...(query?.bool?.should ?? [])],
        must: [...(query?.bool?.must ?? [])],
        must_not: addEmptyDataFilterQuery([...(query?.bool?.must_not ?? [])]),
      },
    },
    sort: getMultiFieldsSort(sort),
    ignore_unavailable: true,
  };
};
