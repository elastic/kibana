/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface BuildIncludeNullFilterParams {
  fieldName: string;
  dataViewId: string | undefined;
  value: Array<string | number | boolean>;
  negate: boolean;
}

export const buildIncludeNullFilter = ({
  fieldName,
  dataViewId,
  value,
  negate,
}: BuildIncludeNullFilterParams) => ({
  meta: {
    type: 'custom',
    key: fieldName,
    index: dataViewId,
    alias: `${fieldName}: ${value[0]} OR null`,
    disabled: false,
    negate,
  },
  query: {
    bool: {
      should: [
        { match_phrase: { [fieldName]: value[0] } },
        { bool: { must_not: { exists: { field: fieldName } } } },
      ],
      minimum_should_match: 1,
    },
  },
});
