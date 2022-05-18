/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';

/**
 * Given a single rule id this will return the number of event-log execution
 * completed docs
 * @param es The ES client
 * @param log
 * @param ruleId Rule id
 */
export const getEventLogExecuteCompleteById = async (
  es: Client,
  log: ToolingLog,
  ruleId: string
): Promise<number> => {
  const response = await es.search({
    index: '.kibana-event-log*',
    track_total_hits: true,
    size: 0,
    query: {
      bool: {
        must: [],
        filter: [
          {
            match_phrase: {
              'event.provider': 'alerting',
            },
          },
          {
            match_phrase: {
              'event.action': 'execute',
            },
          },
          {
            match_phrase: {
              'rule.id': ruleId,
            },
          },
        ],
        should: [],
        must_not: [],
      },
    },
  });

  return (response?.hits?.total as SearchTotalHits)?.value ?? 0;
};
