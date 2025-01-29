/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { type LogThresholdParams } from '@kbn/response-ops-rule-params/log_threshold';
import type { CountCriteria, Criterion, ExecutionTimeRange } from '.';
import { Comparator } from '.';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';

export type LogThresholdRuleTypeParams = LogThresholdParams;

export const buildFiltersFromCriteria = (
  params: Pick<LogThresholdParams, 'timeSize' | 'timeUnit'> & { criteria: CountCriteria },
  timestampField: string,
  executionTimeRange?: ExecutionTimeRange
) => {
  const { timeSize, timeUnit, criteria } = params;
  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const intervalAsMs = intervalAsSeconds * 1000;
  const to = executionTimeRange?.lte || Date.now();
  const from = executionTimeRange?.gte || to - intervalAsMs;

  const positiveCriteria = criteria.filter((criterion) =>
    positiveComparators.includes(criterion.comparator)
  );
  const negativeCriteria = criteria.filter((criterion) =>
    negativeComparators.includes(criterion.comparator)
  );
  // Positive assertions (things that "must" match)
  const mustFilters = buildFiltersForCriteria(positiveCriteria);
  // Negative assertions (things that "must not" match)
  const mustNotFilters = buildFiltersForCriteria(negativeCriteria);

  const rangeFilter = {
    range: {
      [timestampField]: {
        gte: from,
        lte: to,
        format: 'epoch_millis',
      },
    },
  };

  // For group by scenarios we'll pad the time range by 1 x the interval size on the left (lte) and right (gte), this is so
  // a wider net is cast to "capture" the groups. This is to account for scenarios where we want ascertain if
  // there were "no documents" (less than 1 for example). In these cases we may be missing documents to build the groups
  // and match / not match the criteria.
  const groupedRangeFilter = {
    range: {
      [timestampField]: {
        gte: from - intervalAsMs,
        lte: to + intervalAsMs,
        format: 'epoch_millis',
      },
    },
  };

  const mustFiltersFields = positiveCriteria.map((criterion) => criterion.field);

  return { rangeFilter, groupedRangeFilter, mustFilters, mustNotFilters, mustFiltersFields };
};

const buildFiltersForCriteria = (criteria: CountCriteria) => {
  let filters: estypes.QueryDslQueryContainer[] = [];

  criteria.forEach((criterion) => {
    const criterionQuery = buildCriterionQuery(criterion);
    if (criterionQuery) {
      filters = [...filters, criterionQuery];
    }
  });
  return filters;
};

const buildCriterionQuery = (criterion: Criterion): estypes.QueryDslQueryContainer | undefined => {
  const { field, value, comparator } = criterion;

  const queryType = getQueryMappingForComparator(comparator);

  switch (queryType) {
    case 'term':
      return {
        term: {
          [field]: {
            value,
          },
        },
      };
    case 'match': {
      return {
        match: {
          [field]: value,
        },
      };
    }
    case 'match_phrase': {
      return {
        match_phrase: {
          [field]: String(value),
        },
      };
    }
    case 'range': {
      const comparatorToRangePropertyMapping: {
        [key: string]: string;
      } = {
        [Comparator.LT]: 'lt',
        [Comparator.LT_OR_EQ]: 'lte',
        [Comparator.GT]: 'gt',
        [Comparator.GT_OR_EQ]: 'gte',
      };

      const rangeProperty = comparatorToRangePropertyMapping[comparator];

      return {
        range: {
          [field]: {
            [rangeProperty]: value,
          },
        },
      };
    }
    default: {
      return undefined;
    }
  }
};

export const positiveComparators = [
  Comparator.GT,
  Comparator.GT_OR_EQ,
  Comparator.LT,
  Comparator.LT_OR_EQ,
  Comparator.EQ,
  Comparator.MATCH,
  Comparator.MATCH_PHRASE,
];

export const negativeComparators = [
  Comparator.NOT_EQ,
  Comparator.NOT_MATCH,
  Comparator.NOT_MATCH_PHRASE,
];

export const queryMappings: {
  [key: string]: string;
} = {
  [Comparator.GT]: 'range',
  [Comparator.GT_OR_EQ]: 'range',
  [Comparator.LT]: 'range',
  [Comparator.LT_OR_EQ]: 'range',
  [Comparator.EQ]: 'term',
  [Comparator.MATCH]: 'match',
  [Comparator.MATCH_PHRASE]: 'match_phrase',
  [Comparator.NOT_EQ]: 'term',
  [Comparator.NOT_MATCH]: 'match',
  [Comparator.NOT_MATCH_PHRASE]: 'match_phrase',
};

const getQueryMappingForComparator = (comparator: Comparator) => {
  return queryMappings[comparator];
};
