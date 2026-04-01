/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * By default, ES will sort keyword fields in case-sensitive format, the
 * following fields are required to have a case-insensitive sorting.
 */
export const FIELDS_REQUIRING_CASE_INSENSITIVE_SORT = [
  'rule.section',
  'resource.name',
  'resource.sub_type',
];

/**
 * Generates Painless sorting if the given field is matched or returns default sorting.
 * This painless script will sort the field in case-insensitive manner.
 * Missing values are placed last regardless of sort direction.
 */
export const getSortField = ({
  field,
  direction,
}: {
  field: string;
  direction: 'asc' | 'desc';
}) => {
  if (FIELDS_REQUIRING_CASE_INSENSITIVE_SORT.includes(field)) {
    // Use a high Unicode sentinel for ascending so missing values sort last,
    // and an empty string for descending so missing values also sort last.
    // Note: Painless double-quoted strings only support \\ and \" escapes,
    // so we embed the actual U+FFFF character rather than a \uffff escape sequence.
    const missingFallback = direction === 'asc' ? '\uffff' : '';
    return {
      _script: {
        type: 'string' as const,
        order: direction,
        script: {
          source: `doc.containsKey("${field}") && !doc["${field}"].empty ? doc["${field}"].value.toLowerCase() : "${missingFallback}"`,
          lang: 'painless',
        },
      },
    };
  }
  return { [field]: { order: direction, unmapped_type: 'keyword' } };
};

export const getMultiFieldsSort = (sort: string[][]) => {
  return sort.map(([id, direction]) => {
    return {
      ...getSortField({ field: id, direction: direction as 'asc' | 'desc' }),
    };
  });
};
