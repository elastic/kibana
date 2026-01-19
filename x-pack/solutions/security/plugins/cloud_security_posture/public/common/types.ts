/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Criteria } from '@elastic/eui';
import type { Filter, Query, EsQueryConfig } from '@kbn/es-query';

export interface FindingsBaseURLQuery {
  query: Query;
  filters: Filter[];
  /**
   * Filters that are part of the query but not persisted in the URL or in the Filter Manager
   */
  nonPersistedFilters?: Filter[];
  /**
   * Grouping component selection
   */
  groupBy?: string[];
}

export interface FindingsBaseESQueryConfig {
  config: EsQueryConfig;
}

export type Sort<T> = NonNullable<Criteria<T>['sort']>;

export type VulnerabilityGroupingMultiValueOptions =
  | 'vulnerability.id'
  | 'package.name'
  | 'package.version'
  | 'package.fixed_version';
