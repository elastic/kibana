/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { countDownES } from './count_down_es';

export const downgradeImmutableRule = async (
  es: Client,
  log: ToolingLog,
  ruleId: string
): Promise<void> => {
  return countDownES(
    async () => {
      return es.updateByQuery(
        {
          index: '.kibana',
          refresh: true,
          wait_for_completion: true,
          body: {
            script: {
              lang: 'painless',
              source: 'ctx._source.alert.params.version--',
            },
            query: {
              term: {
                'alert.params.ruleId': ruleId,
              },
            },
          },
        },
        { meta: true }
      );
    },
    'downgradeImmutableRule',
    log
  );
};
