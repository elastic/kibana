/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkResponse, ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';

import * as RA from 'fp-ts/ReadonlyArray';
import * as E from 'fp-ts/Either';
import type { BulkItemOutcome } from '../types';

const actionResult = (item: BulkResponse['items'][number]) =>
  item.index ?? item.update ?? item.delete ?? item.create;

export const getErrorFromBulkResponse = (resp: BulkResponse): ErrorCause[] =>
  resp.errors
    ? resp.items
        .map((item) => actionResult(item)?.error)
        .filter((e): e is ErrorCause => e !== undefined)
    : [];

export const partitionBulkResults = <T>(resp: BulkResponse, entities: T[]): BulkItemOutcome<T> => {
  const results = RA.zipWith(entities, resp.items, (entity, item) => {
    const error = actionResult(item)?.error;
    return error
      ? E.left({
          entity,
          item,
          error: `${error.type}: ${error.reason}`,
        })
      : E.right(entity);
  });

  const { left: failed, right: succeeded } = RA.separate(results);
  return { succeeded, failed };
};

export const errorsMsg = (errors: readonly ErrorCause[]): string =>
  errors.length > 0 ? errors.map((e) => `${e.type}: ${e.reason}`).join('; ') : 'No errors found';

export const isTimestampGreaterThan = (date1: string, date2: string) => {
  const m1 = moment(date1);
  const m2 = moment(date2);
  if (!m1.isValid()) return false;
  if (!m2.isValid()) return true;
  return m1.isAfter(m2);
};

/**
 * Looks up which EUIDs already have a document in the watchlist index,
 * returning a Map from EUID → ES document _id.
 */
export const getExistingEntitiesMap = async (
  esClient: ElasticsearchClient,
  watchlist: { id: string; index: string },
  euids: string[]
): Promise<Map<string, string>> => {
  if (euids.length === 0) return new Map();

  const uniqueEuids = uniq(euids);
  const response = await esClient.search<{ entity?: { id?: string } }>({
    index: watchlist.index,
    size: uniqueEuids.length,
    query: {
      bool: {
        must: [{ terms: { 'entity.id': uniqueEuids } }, { term: { 'watchlist.id': watchlist.id } }],
      },
    },
    _source: ['entity.id'],
  });

  return response.hits.hits.reduce((map, hit) => {
    const euid = hit._source?.entity?.id;
    if (euid && hit._id) map.set(euid, hit._id);
    return map;
  }, new Map<string, string>());
};
