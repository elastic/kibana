/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

export const deleteAllGaps = async (client: Client) => {
  const response = await client.deleteByQuery({
    index: '.ds-.kibana-event-log-*',
    refresh: true,
    query: {
      bool: {
        must: [{ term: { 'event.action': 'gap' } }, { term: { 'event.provider': 'alerting' } }],
      },
    },
  });

  return response.deleted;
};
