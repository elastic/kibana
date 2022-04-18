/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/dev-utils';
import type { Client } from '@elastic/elasticsearch';

import { countDownES } from './count_down_es';

/**
 * Remove all .kibana-event-log-* documents with an execution.uuid
 * This will retry 50 times before giving up and hopefully still not interfere with other tests
 * @param es The ElasticSearch handle
 * @param log The tooling logger
 */
export const deleteAllEventLogExecutionEvents = async (
  es: Client,
  log: ToolingLog
): Promise<void> => {
  return countDownES(
    async () => {
      return es.deleteByQuery(
        {
          index: '.kibana-event-log-*',
          q: '_exists_:kibana.alert.rule.execution.uuid',
          wait_for_completion: true,
          refresh: true,
          body: {},
        },
        { meta: true }
      );
    },
    'deleteAllEventLogExecutionEvents',
    log
  );
};
