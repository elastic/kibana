/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import moment from 'moment';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';

export const parseDateString = ({
  date,
  forceNow,
  name,
}: {
  date: string;
  forceNow: Date;
  name?: string;
}): moment.Moment => {
  const parsedDate = dateMath.parse(date, {
    forceNow,
  });
  if (parsedDate == null || !parsedDate.isValid()) {
    throw Error(`Failed to parse '${name ?? 'date string'}'`);
  }
  return parsedDate;
};

/**
 * Returns true if any of the provided index patterns targets a remote cluster.
 *
 * Cross-cluster search (CCS) targets use the `<cluster>:<index>` syntax, so any
 * entry containing a colon is treated as cross-cluster (e.g. `remote:logs-*`).
 */
export const hasCrossClusterIndices = (indices: string[] = []): boolean =>
  indices.some((index) => index.includes(':'));

export const validateHistoryWindowStart = ({
  historyWindowStart,
  from,
}: {
  historyWindowStart: string;
  from: string;
}) => {
  const forceNow = moment().toDate();
  const parsedHistoryWindowStart = parseDateString({
    date: historyWindowStart,
    forceNow,
    name: 'historyWindowStart',
  });
  const parsedFrom = parseDateString({ date: from, forceNow, name: 'from' });
  if (parsedHistoryWindowStart.isSameOrAfter(parsedFrom)) {
    throw Error(
      `History window size is smaller than rule interval + additional lookback, 'historyWindowStart' must be earlier than 'from'`
    );
  }
};

const ESQL_UNSUPPORTED_FIELD_TYPES = new Set(['flattened', 'nested']);

/**
 * Checks whether any of the new terms fields are mapped as types that ES|QL can't handle
 * (e.g. flattened, nested). Uses field_caps to resolve actual mappings across all targeted indices.
 *
 * For flattened subfields (like `labels.env`), field_caps won't return the subfield directly.
 * Instead we check the root field (`labels`) to see if it's flattened.
 */
export const hasFieldsWithUnsupportedEsqlTypes = async ({
  esClient,
  index,
  fields,
}: {
  esClient: ElasticsearchClient;
  index: string[];
  fields: string[];
}): Promise<boolean> => {
  const rootFields = new Set<string>();
  for (const field of fields) {
    rootFields.add(field);
    const dotIndex = field.indexOf('.');
    if (dotIndex > 0) {
      rootFields.add(field.substring(0, dotIndex));
    }
  }

  const fieldCapsResponse = await esClient.fieldCaps({
    index,
    fields: [...rootFields],
    ignore_unavailable: true,
  });

  for (const [, fieldCaps] of Object.entries(fieldCapsResponse.fields)) {
    for (const fieldType of Object.keys(fieldCaps)) {
      if (ESQL_UNSUPPORTED_FIELD_TYPES.has(fieldType)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Takes a list of buckets and creates value from them to be used in 'include' clause of terms aggregation.
 * For a single new terms field, value equals to bucket name
 * Otherwise throws error
 * @returns
 */
export const transformBucketsToValues = (
  newTermsFields: string[],
  buckets: estypes.AggregationsCompositeBucket[]
): Array<string | number> => {
  // if new terms include only one field we don't use runtime mappings and don't stitch fields buckets together
  if (newTermsFields.length === 1) {
    return buckets
      .map((bucket) => Object.values(bucket.key)[0])
      .filter((value): value is string | number => value != null);
  }
  throw Error('Can be used for single new terms field only');
};
