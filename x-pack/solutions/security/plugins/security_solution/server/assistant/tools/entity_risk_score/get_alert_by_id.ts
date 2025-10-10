/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common';
import type { AlertData } from '../../../../public/detection_engine/rule_exceptions/utils/types';

export const createGetAlertsById =
  ({ esClient }: { esClient: ElasticsearchClient }) =>
  async ({
    index,
    ids,
    anonymizationFields,
  }: {
    index: string;
    ids: string[];
    anonymizationFields: AnonymizationFieldResponse[];
  }): Promise<Record<string, AlertData>> => {
    const query = buildAlertsByIdQuery(ids, index, anonymizationFields);

    const response = await esClient.search<AlertData>(query);

    return response.hits.hits.reduce<Record<string, AlertData>>((acc, hit) => {
      if (hit.fields && hit._id) {
        acc[hit._id] = hit.fields as AlertData;
      }
      return acc;
    }, {});
  };

const buildAlertsByIdQuery = (
  ids: string[],
  index: string | undefined,
  anonymizationFields: AnonymizationFieldResponse[]
): SearchRequest => {
  const filter = [{ terms: { _id: ids } }];

  return {
    index,
    ignore_unavailable: true,
    size: ids.length,
    from: 0,
    query: { bool: { filter } },

    allow_no_indices: true,
    _source: false,

    fields: anonymizationFields
      .filter((fieldItem) => fieldItem.allowed)
      .map((fieldItem) => ({
        field: fieldItem.field,
        include_unmapped: true,
      })),
  };
};
