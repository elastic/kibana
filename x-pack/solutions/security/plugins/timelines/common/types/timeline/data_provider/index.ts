/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Represents the Timeline data providers */

/** The `is` operator in a KQL query */
export const IS_OPERATOR = ':';

/** The `exists` operator in a KQL query */
export const EXISTS_OPERATOR = ':*';

/** The `is one of` operator in a KQL query */
export const IS_ONE_OF_OPERATOR = 'includes';

/** The operator applied to a field */
export type QueryOperator = typeof IS_OPERATOR | typeof EXISTS_OPERATOR | typeof IS_ONE_OF_OPERATOR;

export interface QueryMatch {
  field: string;
  displayField?: string;
  value: string | number | boolean | Array<string | number | boolean>;
  displayValue?: string | number | boolean;
  operator: QueryOperator;
}

export interface DataProvider {
  /** Uniquely identifies a data provider */
  id: string;
  /** Human readable */
  name: string;
  /**
   * When `false`, a data provider is temporarily disabled, but not removed from
   * the timeline. default: `true`
   */
  enabled: boolean;
  /**
   * When `true`, a data provider is excluding the match, but not removed from
   * the timeline. default: `false`
   */
  excluded: boolean;
  /**
   * Returns the KQL query who have been added by user
   */
  kqlQuery: string;
  /**
   * Returns a query properties that, when executed, returns the data for this provider
   */
  queryMatch: QueryMatch;
  /**
   * Additional query clauses that are ANDed with this query to narrow results
   */
  and: DataProvidersAnd[];
  /**
   * Returns a DataProviderType
   */
  type?: 'default' | 'template';
}

export type DataProvidersAnd = Pick<DataProvider, Exclude<keyof DataProvider, 'and'>>;
