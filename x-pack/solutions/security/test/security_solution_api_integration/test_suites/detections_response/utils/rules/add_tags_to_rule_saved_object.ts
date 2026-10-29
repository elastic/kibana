/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { countDownES } from '../count_down_es';

interface AddTagsToRuleSavedObjectParams {
  ruleId: string;
  tags: string[];
}

/**
 * Appends tags directly to the rule saved object bypassing the Detection Engine API.
 *
 * Simulates the Alerting Framework task runner writing system-managed tags
 * (e.g. the missing UIAM API key tag) to a rule without the Detection Engine
 * recalculating the rule's `rule_source`.
 */
export const addTagsToRuleSavedObject = async (
  es: Client,
  log: ToolingLog,
  { ruleId, tags }: AddTagsToRuleSavedObjectParams
): Promise<void> => {
  return countDownES(
    async () => {
      return es.updateByQuery(
        {
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          refresh: true,
          wait_for_completion: true,
          script: {
            lang: 'painless',
            source: 'ctx._source.alert.tags.addAll(params.tags)',
            params: { tags },
          },
          query: {
            term: {
              'alert.params.ruleId': ruleId,
            },
          },
        },
        { meta: true }
      );
    },
    'addTagsToRuleSavedObject',
    log
  );
};
