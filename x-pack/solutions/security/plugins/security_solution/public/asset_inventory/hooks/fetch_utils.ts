/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';
import { ASSET_FIELDS } from '../constants';

export const getRuntimeMappingsFromSort = (fields: string[], sort: string[][]) => {
  return sort
    .filter(([field]) => fields.includes(field))
    .reduce((acc, [field]) => {
      const type: RuntimePrimitiveTypes = 'keyword';

      return {
        ...acc,
        [field]: {
          type,
        },
      };
    }, {});
};

export const getMultiFieldsSort = (sort: string[][]) => {
  return sort.map(([id, direction]) => {
    return {
      ...getSortField({ field: id, direction }),
    };
  });
};

/**
 * By default, ES will sort keyword fields in case-sensitive format, the
 * following fields are required to have a case-insensitive sorting.
 */
const fieldsRequiredSortingByPainlessScript: string[] = [ASSET_FIELDS.ENTITY_NAME]; // TODO TBD

/**
 * Generates Painless sorting if the given field is matched or returns default sorting
 * This painless script will sort the field in case-insensitive manner
 */
const getSortField = ({ field, direction }: { field: string; direction: string }) => {
  if (fieldsRequiredSortingByPainlessScript.includes(field)) {
    return {
      _script: {
        type: 'string',
        order: direction,
        script: {
          source: `doc["${field}"].value.toLowerCase()`,
          lang: 'painless',
        },
      },
    };
  }
  return { [field]: direction };
};
