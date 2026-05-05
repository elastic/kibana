/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
type SignificantEventDocument = any;

export const getSignificantEventByEventId = async ({
  esClient,
  eventId,
  index,
}: {
  esClient: ElasticsearchClient;
  eventId: string;
  index: string;
}): Promise<SignificantEventDocument | undefined> => {
  const result = await esClient.search({
    index,
    size: 1,
    _source: true,
    query: {
      term: { event_id: eventId },
    },
  });

  const source = result.hits.hits[0]?._source as SignificantEventDocument | undefined;
  return source;
};
