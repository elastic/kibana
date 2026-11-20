/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  MOBILE_FIELDS,
  MOBILE_REQUIRED_FIELDS,
  MOBILE_SOURCE_INDICES,
} from '../../../common/mobile_panel';
import type { MappedFields } from '../../../common/mobile_panel';
import { toEsqlRows } from '../../services/sessions/summary_documents';
import type { EsqlRow } from '../../services/sessions/summary_documents';
import { environmentFilter } from '../helpers/environment';
import { ENVIRONMENT_FIELDS } from '../otel/queries';

/**
 * The mobile fields some OTel index the user can read maps; the queries read only those, as ES|QL
 * rejects a field no index maps.
 */
export const getMappedMobileFields = async (
  esClient: ElasticsearchClient,
  signal?: AbortSignal
): Promise<MappedFields> => {
  const { fields } = await esClient.fieldCaps(
    {
      index: MOBILE_SOURCE_INDICES,
      fields: Object.values(MOBILE_FIELDS),
      ignore_unavailable: true,
      allow_no_indices: true,
    },
    { signal }
  );
  return new Set(Object.keys(fields));
};

/** Whether the fields hold any mobile data to query. */
export const hasMobileData = (mapped: MappedFields): boolean =>
  MOBILE_REQUIRED_FIELDS.every((field) => mapped.has(field));

const UNKNOWN_INDEX = /Unknown index/;

/** Whether ES|QL rejected the query because none of its indices exists (anymore). */
export const isUnknownIndexError = (error: unknown): boolean => {
  const { type, reason } =
    (error as { meta?: { body?: { error?: { type?: string; reason?: string } } } })?.meta?.body
      ?.error ?? {};
  return type === 'verification_exception' && UNKNOWN_INDEX.test(reason ?? '');
};

/** The rows of an ES|QL query, none when its indices are gone. */
export const runEsql = async (
  esClient: ElasticsearchClient,
  query: string,
  filter: estypes.QueryDslQueryContainer,
  signal?: AbortSignal
): Promise<EsqlRow[]> => {
  try {
    return toEsqlRows(
      await esClient.esql.query({ query, filter, allow_partial_results: true }, { signal })
    );
  } catch (error) {
    if (isUnknownIndexError(error)) {
      return [];
    }
    throw error;
  }
};

/** The documents of the time range, in `environment` when set, as an ES|QL `filter`. */
export const timeFilter = (
  start: number,
  end: number,
  environment: string | undefined
): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      { range: { '@timestamp': { gte: start, lte: end, format: 'epoch_millis' } } },
      environmentFilter(ENVIRONMENT_FIELDS, environment),
    ],
  },
});
