/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type { Filter } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ThreatMapping } from '../../../../../../common/api/detection_engine/model/rule_schema';

import type {
  BooleanFilter,
  BuildEntriesMappingFilterOptions,
  BuildThreatMappingFilterOptions,
  CreateAndOrClausesOptions,
  CreateInnerAndClausesOptions,
  FilterThreatMappingOptions,
  TermQuery,
  ThreatMappingEntries,
} from './types';
import { ThreatMatchQueryType } from './types';
import { encodeThreatMatchNamedQuery } from './utils';

export const MAX_CHUNK_SIZE = 1024;

export const buildThreatMappingFilter = ({
  threatMapping,
  threatList,
  entryKey = 'value',
  allowedFieldsForTermsQuery,
}: BuildThreatMappingFilterOptions): Filter => {
  const query = buildEntriesMappingFilter({
    threatMapping,
    threatList,
    entryKey,
    allowedFieldsForTermsQuery,
  });
  const filterChunk: Filter = {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
    },
    query,
  };

  return filterChunk;
};

/**
 * Filters out any combined "AND" entries which do not include all the threat list items.
 */
export const filterThreatMapping = ({
  threatMapping,
  threatListItem,
  entryKey,
}: FilterThreatMappingOptions): ThreatMapping =>
  threatMapping
    .map((threatMap) => {
      const atLeastOneItemMissingInThreatList = threatMap.entries.some((entry) => {
        // DOES NOT MATCH clause allows undefined values
        if (entry.negate) {
          return false;
        }
        const itemValue = get(entry[entryKey], threatListItem.fields);
        return itemValue == null || itemValue.length !== 1;
      });
      if (atLeastOneItemMissingInThreatList) {
        return { ...threatMap, entries: [] };
      } else {
        return { ...threatMap, entries: threatMap.entries };
      }
    })
    .filter((threatMap) => threatMap.entries.length !== 0);

export const createInnerAndClauses = ({
  threatMappingEntries,
  threatListItem,
  entryKey,
}: CreateInnerAndClausesOptions): QueryDslQueryContainer[] => {
  return threatMappingEntries.reduce<QueryDslQueryContainer[]>((accum, threatMappingEntry) => {
    const value = get(threatMappingEntry[entryKey], threatListItem.fields);
    const queryName = encodeThreatMatchNamedQuery({
      id: threatListItem._id,
      index: threatListItem._index,
      field: threatMappingEntry.field,
      value: threatMappingEntry.value,
      queryType: ThreatMatchQueryType.match,
      negate: threatMappingEntry.negate,
    });
    const matchKey = threatMappingEntry[entryKey === 'field' ? 'value' : 'field'];

    if (threatMappingEntry.negate) {
      const negateClause = buildNegateClause(value, matchKey, queryName);
      if (negateClause) {
        accum.push(negateClause);
      }
    } else if (value != null && value.length === 1) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        match: {
          [matchKey]: {
            query: value[0],
            _name: queryName,
          },
        },
      });
    }

    return accum;
  }, []);
};

const buildNegateClause = (
  value: unknown,
  matchKey: string,
  queryName: string
): QueryDslQueryContainer | undefined => {
  if (value == null) {
    return {
      exists: {
        field: matchKey,
        _name: queryName,
      },
    };
  }

  if (Array.isArray(value) && value.length === 1) {
    return {
      bool: {
        must_not: {
          match: {
            [matchKey]: {
              query: value[0],
            },
          },
        },
        _name: queryName,
      },
    };
  }

  return undefined;
};

export const createAndOrClauses = ({
  threatMapping,
  threatListItem,
  entryKey,
}: CreateAndOrClausesOptions): QueryDslQueryContainer[] => {
  const should = threatMapping.reduce<QueryDslQueryContainer[]>((accum, threatMap) => {
    const innerAndClauses = createInnerAndClauses({
      threatMappingEntries: threatMap.entries,
      threatListItem,
      entryKey,
    });
    if (innerAndClauses.length !== 0) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        bool: { filter: innerAndClauses },
      });
    }
    return accum;
  }, []);
  return should;
};

export const buildEntriesMappingFilter = ({
  threatMapping,
  threatList,
  entryKey,
  allowedFieldsForTermsQuery,
}: BuildEntriesMappingFilterOptions): BooleanFilter => {
  const allFieldAllowedForTermQuery = (entries: ThreatMappingEntries) =>
    entries.every(
      (entry) =>
        allowedFieldsForTermsQuery?.source?.[entry.field] &&
        allowedFieldsForTermsQuery?.threat?.[entry.value]
    );
  const combinedShould = threatMapping.reduce<Array<QueryDslQueryContainer | TermQuery>>(
    (acc, threatMap) => {
      if (threatMap.entries.length > 1 || !allFieldAllowedForTermQuery(threatMap.entries)) {
        threatList.forEach((threatListItem) => {
          const filteredEntries = filterThreatMapping({
            threatMapping: [threatMap],
            threatListItem,
            entryKey,
          });
          const queryWithAndOrClause = createAndOrClauses({
            threatMapping: filteredEntries,
            threatListItem,
            entryKey,
          });
          if (queryWithAndOrClause.length !== 0) {
            // These values can be 10k+ large, so using a push here for performance
            acc.push(...queryWithAndOrClause);
          }
        });
      } else {
        const threatMappingEntry = threatMap.entries[0];
        const threats: string[] = threatList
          .map((threatListItem) => get(threatMappingEntry[entryKey], threatListItem.fields))
          .filter((val) => val)
          .map((val) => val[0]);
        if (threats.length > 0) {
          acc.push({
            terms: {
              _name: encodeThreatMatchNamedQuery({
                field: threatMappingEntry.field,
                value: threatMappingEntry.value,
                queryType: ThreatMatchQueryType.term,
              }),
              [threatMappingEntry[entryKey === 'field' ? 'value' : 'field']]: threats,
            },
          });
        }
      }
      return acc;
    },
    []
  );

  return { bool: { should: combinedShould, minimum_should_match: 1 } };
};
