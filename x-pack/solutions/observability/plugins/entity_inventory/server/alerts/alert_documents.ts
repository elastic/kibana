/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { CLASSIC_ALERT_INDICES } from './classic_matcher';
import { V2_ALERT_INDEX } from './v2_matcher';

export interface AlertDocument {
  index: string;
  id: string;
  document: Record<string, unknown>;
}

/** How many events of a v2 alert to return, newest first. */
const MAX_V2_EVENTS = 5;

/**
 * The stored document of an alert. A classic alert is one document. An alerting v2 alert is its
 * events, so this returns the newest few. Both are limited to the space.
 */
export const getAlertDocuments = async ({
  esClient,
  source,
  alertId,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  source: 'classic' | 'v2';
  alertId: string;
  spaceId: string;
}): Promise<AlertDocument[]> => {
  const response =
    source === 'classic'
      ? await esClient.search({
          index: CLASSIC_ALERT_INDICES,
          size: 1,
          query: {
            bool: {
              filter: [
                { term: { 'kibana.alert.uuid': alertId } },
                { term: { 'kibana.space_ids': spaceId } },
              ],
            },
          },
        })
      : await esClient.search({
          index: V2_ALERT_INDEX,
          size: MAX_V2_EVENTS,
          sort: [{ '@timestamp': 'desc' }],
          query: {
            bool: { filter: [{ term: { 'alert.id': alertId } }, { term: { space_id: spaceId } }] },
          },
        });

  return response.hits.hits.map(({ _index, _id, _source }) => ({
    index: _index,
    id: _id ?? '',
    document: (_source ?? {}) as Record<string, unknown>,
  }));
};
