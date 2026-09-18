/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PassThrough } from 'stream';

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { isRangeType } from './build_lookup_mappings';
import { streamListValues } from './paginate_hits';

const valuesQuery = (type: Type): estypes.QueryDslQueryContainer =>
  isRangeType(type) ? { term: { kind: 'source' } } : { match_all: {} };

/**
 * Count the elements of a lookup list that determine its inline size. Both the inline
 * and post-filter membership paths read the source documents (the coalesced set is
 * async and consumed only by the future join), so sizing counts the sources: for a
 * range list one range clause per source, for an equality/native list one document
 * per distinct value. Counting sources, not the coalesced set, also keeps the size
 * check synchronous and correct, since the coalesced set can lag a recent edit.
 */
export const countLookupItems = async ({
  esClient,
  index,
  type,
}: {
  esClient: ElasticsearchClient;
  index: string;
  type: Type;
}): Promise<number> => {
  const query: estypes.QueryDslQueryContainer = isRangeType(type)
    ? { term: { kind: 'source' } }
    : { match_all: {} };
  const { count } = await esClient.count({ index, query });
  return count;
};

/**
 * Pull based streaming read of a lookup list's authored values, one batch at a
 * time, paged with a point in time so nothing is truncated and only one batch is
 * in memory at once. For range lists this reads the source docs (verbatim, so
 * export round-trips exactly); the coalesced docs are never read here. For
 * equality/native lists it reads the single `value`.
 */
export const streamLookupItemValues = ({
  esClient,
  index,
  type,
}: {
  esClient: ElasticsearchClient;
  index: string;
  type: Type;
}): AsyncGenerator<string[], void, void> =>
  streamListValues<{ value?: unknown }>({
    _source: ['value'],
    esClient,
    extract: (source) => (source?.value == null ? undefined : String(source.value)),
    index,
    query: valuesQuery(type),
  });

/**
 * Collect every authored value into one array. Callers that can work a batch at a
 * time (like export) should consume a value generator directly instead.
 */
export const readLookupItemValues = async ({
  esClient,
  index,
  type,
}: {
  esClient: ElasticsearchClient;
  index: string;
  type: Type;
}): Promise<string[]> => {
  const values: string[] = [];
  for await (const batch of streamLookupItemValues({ esClient, index, type })) {
    values.push(...batch);
  }
  return values;
};

/**
 * Push a value generator to a stream, a batch at a time, so a large list is never
 * fully buffered. Storage neutral: the caller supplies the value generator (lookup
 * or legacy), this only drains it to the stream.
 */
export const writeValuesToStream = async ({
  stream,
  stringToAppend,
  values,
}: {
  stream: PassThrough;
  stringToAppend: string | null | undefined;
  values: AsyncGenerator<string[], void, void>;
}): Promise<void> => {
  const append = stringToAppend ?? '\n';
  for await (const batch of values) {
    for (const value of batch) {
      stream.push(`${value}${append}`);
    }
  }
  stream.end();
};

/** Export a lookup list to a stream, one value per line, a batch at a time. */
export const streamLookupItems = ({
  esClient,
  index,
  type,
  stream,
  stringToAppend,
}: {
  esClient: ElasticsearchClient;
  index: string;
  type: Type;
  stream: PassThrough;
  stringToAppend: string | null | undefined;
}): Promise<void> =>
  writeValuesToStream({
    stream,
    stringToAppend,
    values: streamLookupItemValues({ esClient, index, type }),
  });
