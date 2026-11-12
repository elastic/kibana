/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Filter } from '@kbn/es-query';
import type { RowsMode } from '../common';
import { joinAnd } from './esql';
import {
  buildGroupValueBucketExpression,
  buildGroupValueBucketQuery,
  isGroupValueField,
} from './entity_filters';

export interface GroupValueBucket {
  field: string;
  /** `null` for the "no value" bucket. */
  value: string | null;
}

interface SplitGroupFilters {
  /** The buckets of group-valued fields, which resolved rows match by the group's values. */
  groupValueBuckets: GroupValueBucket[];
  /** The bucket filters that stay as they are. */
  otherFilters: Filter[];
}

type MatchPhraseValue = string | { query: string };

const getPhraseValue = (filter: Filter, field: string): string | undefined => {
  const value = (filter.query?.match_phrase as Record<string, MatchPhraseValue> | undefined)?.[
    field
  ];
  if (value == null) return undefined;
  return typeof value === 'string' ? value : value.query;
};

/**
 * Resolved rows show their group's values, so the Group by bucket filters on those fields are
 * taken out, to be matched on the group's values. A bucket with only `@kbn/grouping`'s script
 * filters and no phrase is the "no value" bucket.
 */
export const splitGroupValueFilters = (
  filters: Filter[],
  rowsMode: RowsMode
): SplitGroupFilters => {
  if (rowsMode !== 'resolved') return { groupValueBuckets: [], otherFilters: filters };
  const valuesByField = new Map<string, string[]>();
  const otherFilters: Filter[] = [];
  for (const filter of filters) {
    const field = filter.meta?.key;
    if (field && isGroupValueField(field)) {
      const values = valuesByField.get(field) ?? [];
      const value = getPhraseValue(filter, field);
      valuesByField.set(field, value == null ? values : [...values, value]);
    } else {
      otherFilters.push(filter);
    }
  }
  const groupValueBuckets = [...valuesByField].flatMap(([field, values]): GroupValueBucket[] =>
    values.length ? values.map((value) => ({ field, value })) : [{ field, value: null }]
  );
  return { groupValueBuckets, otherFilters };
};

/** The ES|QL condition of the buckets on the group's values (`undefined` without buckets). */
export const buildGroupValueBucketsExpression = (
  buckets: readonly GroupValueBucket[]
): string | undefined =>
  joinAnd(...buckets.map(({ field, value }) => buildGroupValueBucketExpression(field, value)));

/** The DSL condition of the buckets on the main entity's stored values. */
export const buildGroupValueBucketsQuery = (
  buckets: readonly GroupValueBucket[]
): QueryDslQueryContainer[] =>
  buckets.map(({ field, value }) => buildGroupValueBucketQuery(field, value));
