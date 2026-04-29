/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

import type { MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import {
  getMSearchRequestBody,
  getMSearchRequestHeader,
} from '../helpers/get_unallowed_field_requests';
import type { GetUnallowedFieldValuesInputs } from '../schemas/get_unallowed_field_values';

export const getUnallowedFieldValues = (
  esClient: ElasticsearchClient,
  items: GetUnallowedFieldValuesInputs
) => {
  const searches: MsearchRequestItem[] = items.reduce<MsearchRequestItem[]>(
    (acc, { indexName, indexFieldName, allowedValues }) =>
      acc.concat([
        getMSearchRequestHeader(indexName),
        getMSearchRequestBody({ indexName, indexFieldName, allowedValues }),
      ]),
    []
  );

  return esClient.msearch({
    searches,
  });
};
