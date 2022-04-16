/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ToolingLog } from '@kbn/dev-utils';
import type SuperTest from 'supertest';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/detection_engine/schemas/alerts';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from './count_down_test';
import { getQuerySignalsRuleId } from './get_query_signals_rule_id';

/**
 * Returns all signals both closed and opened by ruleId
 * @param supertest Deps
 */
export const getSignalsByRuleIds = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ruleIds: string[]
): Promise<SearchResponse<DetectionAlert>> => {
  const signalsOpen = await countDownTest<SearchResponse<DetectionAlert>>(
    async () => {
      const response = await supertest
        .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
        .set('kbn-xsrf', 'true')
        .send(getQuerySignalsRuleId(ruleIds));
      if (response.status !== 200) {
        return {
          passed: false,
          errorMessage: `Status is not 200 as expected, it is: ${response.status}`,
        };
      } else {
        return {
          passed: true,
          returnValue: response.body,
        };
      }
    },
    'getSignalsByRuleIds',
    log
  );
  if (signalsOpen == null) {
    throw new Error('Signals not defined after countdown, cannot continue');
  } else {
    return signalsOpen;
  }
};
