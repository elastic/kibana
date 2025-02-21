/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { SLODefinition } from '../../../../domain/models';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../../../common/constants';
import { EsSummaryDocument } from '../../../../services/summary_transform_generator/helpers/create_temp_summary';

export async function getSloSummary(
  esClient: ElasticsearchClient,
  slo: SLODefinition,
  instanceId: string
) {
  try {
    const res = await esClient.search<EsSummaryDocument>({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      body: {
        query: {
          bool: {
            filter: [
              { term: { 'slo.id': slo.id } },
              { term: { 'slo.revision': slo.revision } },
              { term: { 'slo.instanceId': instanceId } },
            ],
          },
        },
        size: 1,
      },
    });

    if (res.hits.hits.length === 0) {
      return undefined;
    }

    return res.hits.hits[0]._source;
  } catch (err) {
    // noop
    return undefined;
  }
}
