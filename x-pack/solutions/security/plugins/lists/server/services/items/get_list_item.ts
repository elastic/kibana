/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Id, ListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { ErrorWithStatusCode } from '../../error_with_status_code';
import type { SearchEsListItemSchema } from '../../schemas/elastic_response';
import { findSourceType } from '../utils/find_source_type';
import { findSourceValue } from '../utils/find_source_value';
import { convertDateNumberToString } from '../utils/convert_date_number_to_string';

interface GetListItemOptions {
  id: Id;
  esClient: ElasticsearchClient;
  listItemIndex: string;
}

export const getListItem = async ({
  id,
  esClient,
  listItemIndex,
}: GetListItemOptions): Promise<ListItemSchema | null> => {
  try {
    const response = await esClient.get<SearchEsListItemSchema>({
      id,
      index: listItemIndex,
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const source = response._source!;
    const type = findSourceType(source);
    if (type == null) {
      return null;
    }

    const value = findSourceValue(source);
    if (value == null) {
      throw new ErrorWithStatusCode(`Was expected ${type} to not be null/undefined`, 400);
    }

    return {
      '@timestamp': convertDateNumberToString(source['@timestamp']),
      _version: encodeHitVersion(response),
      created_at: source.created_at,
      created_by: source.created_by,
      id: response._id,
      list_id: source.list_id,
      meta: source.meta ?? undefined,
      tie_breaker_id: source.tie_breaker_id,
      type,
      updated_at: source.updated_at,
      updated_by: source.updated_by,
      value,
    };
  } catch (e) {
    if (e instanceof errors.ResponseError && e.statusCode === 404) {
      return null;
    }
    throw e;
  }
};
