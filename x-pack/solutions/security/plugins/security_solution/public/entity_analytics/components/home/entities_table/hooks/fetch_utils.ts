/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuntimePrimitiveTypes } from '@kbn/data-views-plugin/common';
import { ENTITY_FIELDS } from '../constants';

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

const fieldsRequiredSortingByPainlessScript: string[] = [ENTITY_FIELDS.ENTITY_NAME];

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
