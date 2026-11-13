/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { EsQueryConfig, Filter, Query } from '@kbn/es-query';
import type { InventoryDocumentFilter } from '../../inventory_api/types';

export interface BuildDocumentFilterParams {
  query?: Query;
  filters?: Filter[];
  attributes?: Record<string, string[]>;
  excludeAttribute?: string;
  esQueryConfig?: EsQueryConfig;
}

export const buildDocumentFilter = ({
  query,
  filters = [],
  attributes = {},
  excludeAttribute,
  esQueryConfig,
}: BuildDocumentFilterParams): InventoryDocumentFilter | undefined => {
  const { bool } = buildEsQuery(undefined, query ? [query] : [], filters, esQueryConfig);

  const attributeClauses = Object.entries(attributes)
    .filter(([name, values]) => name !== excludeAttribute && values.length > 0)
    .map(([name, values]) => ({ terms: { [name]: values } }));
  const filter = [...bool.filter, ...attributeClauses];

  const isEmpty = [bool.must, bool.should, bool.must_not, filter].every(
    ({ length }) => length === 0
  );

  return isEmpty ? undefined : { bool: { ...bool, filter } };
};
