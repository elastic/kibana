/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, EsQueryConfig, Query, DataViewBase } from '@kbn/es-query';
import {
  fromKueryExpression,
  toElasticsearchQuery,
  FilterStateStore,
  buildEsQuery,
} from '@kbn/es-query';
import { get, isEmpty } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import type { DataViewSpec } from '@kbn/data-plugin/common';
import { prepareKQLParam } from '../../../../common/utils/kql';
import type { BrowserFields } from '../../../../common/search_strategy';
import type { DataProvider, DataProvidersAnd } from '../../../../common/types';
import { DataProviderTypeEnum } from '../../../../common/api/timeline';
import { EXISTS_OPERATOR } from '../../../../common/types/timeline';

export type PrimitiveOrArrayOfPrimitives =
  | string
  | number
  | boolean
  | Array<string | number | boolean>;

export interface CombineQueries {
  config: EsQueryConfig;
  dataProviders: DataProvider[];
  dataViewSpec?: DataViewSpec;
  browserFields: BrowserFields;
  filters: Filter[];
  kqlQuery: Query;
  kqlMode: string;
}

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern?: DataViewBase
) => {
  try {
    return kueryExpression
      ? JSON.stringify(toElasticsearchQuery(fromKueryExpression(kueryExpression), indexPattern))
      : '';
  } catch (err) {
    return '';
  }
};

export const isNumber = (value: PrimitiveOrArrayOfPrimitives): value is number =>
  !isNaN(Number(value));

export const convertDateFieldToQuery = (field: string, value: PrimitiveOrArrayOfPrimitives) =>
  `${field}: ${isNumber(value) ? value : new Date(value.toString()).valueOf()}`;

export const getBaseFields = memoizeOne((browserFields: BrowserFields): string[] => {
  const baseFields = get('base', browserFields);
  if (baseFields != null && baseFields.fields != null) {
    return Object.keys(baseFields.fields);
  }
  return [];
});

export const getBrowserFieldPath = (field: string, browserFields: BrowserFields) => {
  const splitFields = field.split('.');
  const baseFields = getBaseFields(browserFields);
  if (baseFields.includes(field)) {
    return ['base', 'fields', field];
  }
  return [splitFields[0], 'fields', field];
};

export const getFieldEsTypes = (field: string, browserFields: BrowserFields): string[] => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  if (browserField != null) {
    return browserField.esTypes;
  }
  return [];
};

export const checkIfFieldTypeIsDate = (field: string, browserFields: BrowserFields) => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  if (browserField != null && browserField.type === 'date') {
    return true;
  }
  return false;
};

export const convertNestedFieldToQuery = (
  field: string,
  value: PrimitiveOrArrayOfPrimitives,
  browserFields: BrowserFields
) => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  const nestedPath = browserField.subType.nested.path;
  const key = field.replace(`${nestedPath}.`, '');
  return `${nestedPath}: { ${key}: ${browserField.type === 'date' ? `"${value}"` : value} }`;
};

export const convertNestedFieldToExistQuery = (field: string, browserFields: BrowserFields) => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  const nestedPath = browserField.subType.nested.path;
  const key = field.replace(`${nestedPath}.`, '');
  return `${nestedPath}: { ${key}: * }`;
};

export const checkIfFieldTypeIsNested = (field: string, browserFields: BrowserFields) => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  if (browserField != null && browserField.subType && browserField.subType.nested) {
    return true;
  }
  return false;
};

const buildQueryMatch = (
  dataProvider: DataProvider | DataProvidersAnd,
  browserFields: BrowserFields
) =>
  `${dataProvider.excluded ? 'NOT ' : ''}${
    dataProvider.queryMatch.operator !== EXISTS_OPERATOR &&
    dataProvider.type !== DataProviderTypeEnum.template
      ? checkIfFieldTypeIsNested(dataProvider.queryMatch.field, browserFields)
        ? convertNestedFieldToQuery(
            dataProvider.queryMatch.field,
            dataProvider.queryMatch.value,
            browserFields
          )
        : checkIfFieldTypeIsDate(dataProvider.queryMatch.field, browserFields)
        ? convertDateFieldToQuery(dataProvider.queryMatch.field, dataProvider.queryMatch.value)
        : `${dataProvider.queryMatch.field} : ${
            Array.isArray(dataProvider.queryMatch.value)
              ? `(${dataProvider.queryMatch.value.join(' OR ')})`
              : prepareKQLParam(dataProvider.queryMatch.value)
          }`
      : checkIfFieldTypeIsNested(dataProvider.queryMatch.field, browserFields)
      ? convertNestedFieldToExistQuery(dataProvider.queryMatch.field, browserFields)
      : `${dataProvider.queryMatch.field} ${EXISTS_OPERATOR}`
  }`.trim();

export const buildGlobalQuery = (dataProviders: DataProvider[], browserFields: BrowserFields) =>
  dataProviders
    .reduce((queries: string[], dataProvider: DataProvider) => {
      const flatDataProviders = [dataProvider, ...dataProvider.and];
      const activeDataProviders = flatDataProviders.filter(
        (flatDataProvider) => flatDataProvider.enabled
      );

      if (!activeDataProviders.length) return queries;

      const activeDataProvidersQueries = activeDataProviders.map((activeDataProvider) =>
        buildQueryMatch(activeDataProvider, browserFields)
      );

      const activeDataProvidersQueryMatch = activeDataProvidersQueries.join(' and ');

      return [...queries, activeDataProvidersQueryMatch];
    }, [])
    .filter((queriesItem) => !isEmpty(queriesItem))
    .reduce((globalQuery: string, queryMatch: string, index: number, queries: string[]) => {
      if (queries.length <= 1) return queryMatch;

      return !index ? `(${queryMatch})` : `${globalQuery} or (${queryMatch})`;
    }, '');

export const buildTimeRangeFilter = (from: string, to: string): Filter =>
  ({
    range: {
      '@timestamp': {
        gte: from,
        lt: to,
        format: 'strict_date_optional_time',
      },
    },
    meta: {
      type: 'range',
      disabled: false,
      negate: false,
      alias: null,
      key: '@timestamp',
      params: {
        gte: from,
        lt: to,
        format: 'strict_date_optional_time',
      },
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  } as Filter);

export const isDataProviderEmpty = (dataProviders: DataProvider[]) => {
  return isEmpty(dataProviders) || isEmpty(dataProviders.filter((d) => d.enabled === true));
};

export const dataViewSpecToViewBase = (dataViewSpec?: DataViewSpec): DataViewBase => {
  return { title: dataViewSpec?.title || '', fields: Object.values(dataViewSpec?.fields || {}) };
};

/**
 * Converts and combined KQL Queries, filters and lucene queries to a single ES Query
 * Given operator is used to combine KQL and lucene queries irrespective of filters
 *
 * It works under 3 assumptions:
 *  - buildESQuery puts KQL queries in the `filter` clause
 *  - buildESQuery puts  filters in the `filter` clause
 *  - buildESQuery puts lucene queries in the `must` clause
 *
 * This assumptions are true as of writing of this change and are being tested. In case those change,
 * and this function breaks, please update the function to reflect the changes in buildESQuery
 *
 * */
export const convertToBuildEsQuery = ({
  config,
  dataViewSpec,
  queries,
  filters,
  luceneQuery,
  operator = 'and',
}: {
  config: EsQueryConfig;
  dataViewSpec: DataViewSpec | undefined;
  queries: Query[];
  filters: Filter[];
  luceneQuery?: Query;
  /* Combines provided KQL Query and Lucene Query */
  operator?: 'and' | 'or';
}): [string, undefined] | [undefined, Error] => {
  try {
    const esDslQuery = buildEsQuery(
      dataViewSpecToViewBase(dataViewSpec),
      queries,
      filters.filter((f) => f.meta.disabled === false),
      {
        nestedIgnoreUnmapped: true, // by default, prevent shard failures when unmapped `nested` fields are queried: https://github.com/elastic/kibana/issues/130340
        ...config,
        dateFormatTZ: undefined,
        /*
         * `filtersInMustClause` puts kql query in `must` instead of `filter` clause and helps us differentiate between kql query and actual filters
         * ⚠️  Contrary to the name of config, it does not touch filters at all.
         */
        filtersInMustClause: true,
      }
    );

    if (luceneQuery) {
      const luceneDslQuery = buildEsQuery(
        dataViewSpecToViewBase(dataViewSpec),
        luceneQuery ?? [],
        [],
        {
          ...config,
          dateFormatTZ: undefined,
        }
      );
      if (operator === 'or') {
        // move `must` clause to `should`
        esDslQuery.bool.should = [...esDslQuery.bool.must, ...luceneDslQuery.bool.must];
        esDslQuery.bool.must = [];
      } else {
        esDslQuery.bool.must = [...esDslQuery.bool.must, ...luceneDslQuery.bool.must];
      }
    }

    return [JSON.stringify(esDslQuery), undefined];
  } catch (error) {
    return [undefined, error];
  }
};

export interface CombinedQuery {
  filterQuery: string | undefined;
  kqlError: Error | undefined;
  baseKqlQuery: Query;
}

export const combineQueries = ({
  config,
  dataProviders = [],
  dataViewSpec,
  browserFields,
  filters = [],
  kqlQuery,
  kqlMode,
}: CombineQueries): CombinedQuery | null => {
  const query: Query = { query: '', language: kqlQuery.language };
  const luceneQuery = kqlQuery.language === 'lucene' ? kqlQuery : undefined;
  if (isDataProviderEmpty(dataProviders) && isEmpty(kqlQuery.query) && isEmpty(filters)) {
    return null;
  } else if (isDataProviderEmpty(dataProviders) && isEmpty(kqlQuery.query) && !isEmpty(filters)) {
    const [filterQuery, kqlError] = convertToBuildEsQuery({
      config,
      queries: [query],
      dataViewSpec,
      filters,
    });

    return {
      filterQuery,
      kqlError,
      baseKqlQuery: query,
    };
  }

  const operatorKqlQuery = kqlMode === 'filter' ? 'and' : 'or';
  const dataProviderQueryString = buildGlobalQuery(dataProviders, browserFields); // based on Data Providers
  const dataProviderQuery: Query = {
    query: dataProviderQueryString,
    language: 'kuery',
  };

  let queries = [];
  if (query.language === 'kuery') {
    query.query = combineKQLQueryString(
      operatorKqlQuery,
      dataProviderQueryString,
      kqlQuery.query as string
    );
    queries.push(query);
  } else {
    queries = [dataProviderQuery];
  }

  const [filterQuery, kqlError] = convertToBuildEsQuery({
    config,
    queries,
    dataViewSpec,
    filters,
    luceneQuery,
    operator: operatorKqlQuery,
  });

  return {
    filterQuery,
    kqlError,
    baseKqlQuery: query,
  };
};

export const combineKQLQueryString = (operator: 'and' | 'or', ...queryStrings: string[]) => {
  return queryStrings
    .filter(Boolean)
    .map((q) => `${q}`)
    .join(` (${operator}) `)
    .trim();
};
