/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMvExpandFields } from '@kbn/securitysolution-utils';
import type { EsqlResultColumn } from '../esql_request';

export const getMvExpandUsage = (columns: EsqlResultColumn[], query: string) => {
  const expandedFieldsFromQuery = getMvExpandFields(query);
  if (expandedFieldsFromQuery.length === 0) {
    return {
      hasMvExpand: false,
    };
  }

  const columnNamesSet = columns.reduce<Set<string>>((acc, column) => {
    acc.add(column.name);
    return acc;
  }, new Set());
  const hasExpandedFieldsMissed = expandedFieldsFromQuery.some(
    (field) => !columnNamesSet.has(field)
  );
  const expandedFieldsInResponse = hasExpandedFieldsMissed ? [] : expandedFieldsFromQuery;

  return {
    hasMvExpand: expandedFieldsFromQuery.length > 0,
    expandedFieldsInResponse,
  };
};
