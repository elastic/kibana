/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type { Filter } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import type {
  BooleanFilter,
  BuildEntriesMappingFilterOptions,
  BuildThreatMappingFilterOptions,
  CreateNamedAndClauseOptions,
  CreateInnerAndClausesOptions,
  FilterThreatMappingOptions,
  TermQuery,
  ThreatMappingEntries,
} from './types';
import { ThreatMatchQueryType } from './types';
import { encodeThreatMatchNamedQuery } from './utils';

export const MAX_CHUNK_SIZE = 1024;

export const buildThreatMappingFilter = ({
  threatMappings,
  threatList,
  entryKey = 'value',
  allowedFieldsForTermsQuery,
}: BuildThreatMappingFilterOptions): Filter => {
  const query = buildEntriesMappingFilter({
    threatMappings,
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
export const threatMappingEntriesAreValid = ({
  threatMappingEntries,
  threatListItem,
  entryKey,
}: FilterThreatMappingOptions): boolean =>
  threatMappingEntries.every((entry) => {
    // DOES NOT MATCH clause allows undefined values
    if (entry.negate) {
      return true;
    }
    const itemValue = get(entry[entryKey], threatListItem.fields);
    return itemValue != null && itemValue.length === 1;
  });

export const createInnerAndClauses = ({
  threatMappingEntries,
  threatListItem,
  entryKey,
}: CreateInnerAndClausesOptions): QueryDslQueryContainer[] => {
  return threatMappingEntries.reduce<QueryDslQueryContainer[]>((accum, threatMappingEntry) => {
    const value = get(threatMappingEntry[entryKey], threatListItem.fields);
    const matchKey = threatMappingEntry[entryKey === 'field' ? 'value' : 'field'];

    if (threatMappingEntry.negate) {
      const negateClause = buildNegateClause(value, matchKey);
      if (negateClause) {
        accum.push(negateClause);
      }
    } else if (value != null && value.length === 1) {
      // These values could be potentially 10k+ large so mutating the array intentionally
      accum.push({
        match: {
          [matchKey]: {
            query: value[0],
          },
        },
      });
    }

    return accum;
  }, []);
};

const buildNegateClause = (
  value: unknown,
  matchKey: string
): QueryDslQueryContainer | undefined => {
  if (value == null) {
    return {
      exists: {
        field: matchKey,
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
      },
    };
  }

  return undefined;
};

export const createNamedAndClause = ({
  threatMappingEntries,
  threatListItem,
  entryKey,
  threatMappingIndex,
}: CreateNamedAndClauseOptions): QueryDslQueryContainer | undefined => {
  const innerAndClauses = createInnerAndClauses({
    threatMappingEntries,
    threatListItem,
    entryKey,
  });
  if (innerAndClauses.length !== 0) {
    // These values could be potentially 10k+ large so mutating the array intentionally
    return {
      bool: {
        _name: encodeThreatMatchNamedQuery({
          id: threatListItem._id,
          index: threatListItem._index,
          threatMappingIndex,
          queryType: ThreatMatchQueryType.match,
        }),
        filter: innerAndClauses,
      },
    };
  }
};

export const buildEntriesMappingFilter = ({
  threatMappings,
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
  const combinedShould = threatMappings.reduce<Array<QueryDslQueryContainer | TermQuery>>(
    (acc, threatMapping, threatMappingIndex) => {
      if (threatMapping.entries.length > 1 || !allFieldAllowedForTermQuery(threatMapping.entries)) {
        threatList.forEach((threatListItem) => {
          if (
            threatMappingEntriesAreValid({
              threatMappingEntries: threatMapping.entries,
              threatListItem,
              entryKey,
            })
          ) {
            const queryWithAndOrClause = createNamedAndClause({
              threatMappingEntries: threatMapping.entries,
              threatListItem,
              entryKey,
              threatMappingIndex,
            });
            if (queryWithAndOrClause) {
              // These values can be 10k+ large, so using a push here for performance
              acc.push(queryWithAndOrClause);
            }
          }
        });
      } else {
        const threatMappingEntry = threatMapping.entries[0];
        const threats: string[] = threatList
          .map((threatListItem) => get(threatMappingEntry[entryKey], threatListItem.fields))
          .filter((val) => val)
          .map((val) => val[0]);
        if (threats.length > 0) {
          acc.push({
            terms: {
              _name: encodeThreatMatchNamedQuery({
                threatMappingIndex,
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
