/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type FilterValue = string | number;

/**
 * Creates a single KQL filter string based on the provided values.
 *
 * @example
 * ```ts
 * const filter = createBasicFilter('myType', { name: 'foo', category: ['a', 'b']});
 * >>> 'myType.attributes.name: foo AND myType.attributes.category: (a OR b)'
 * ```
 */
export const createSimpleFilter = (
  soTypeName: string,
  filterValues: Record<string, FilterValue | FilterValue[] | undefined>
): string => {
  const filterPath = (fieldName: string) => `${soTypeName}.attributes.${fieldName}`;
  const filterValue = (value: FilterValue | FilterValue[]) => {
    if (Array.isArray(value)) {
      return `(${value.join(' OR ')})`;
    } else {
      return `${value}`;
    }
  };

  return Object.entries(filterValues).reduce((filter, [fieldName, fieldValue]) => {
    if (fieldValue !== undefined) {
      if (filter.length) {
        filter += ' AND ';
      }
      filter += `${filterPath(fieldName)}: ${filterValue(fieldValue)}`;
    }
    return filter;
  }, '');
};
