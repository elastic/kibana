/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/detection_engine/schemas/alerts';
import type { RiskEnrichmentFields } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/enrichments/types';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from './count_down_test';
import { getQuerySignalsId } from './get_query_signals_ids';

/**
 * Given an array of rule ids this will return only signals based on that rule id both
 * open and closed
 * @param supertest agent
 * @param ids Array of the rule ids
 */
export const getSignalsByIds = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ids: string[],
  size?: number
): Promise<SearchResponse<DetectionAlert & RiskEnrichmentFields>> => {
  const signalsOpen = await countDownTest<SearchResponse<DetectionAlert & RiskEnrichmentFields>>(
    async () => {
      const response = await supertest
        .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
        .set('kbn-xsrf', 'true')
        .send(getQuerySignalsId(ids, size));
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
    'getSignalsByIds',
    log
  );
  if (signalsOpen == null) {
    throw new Error('Signals not defined after countdown, cannot continue');
  } else {
    return signalsOpen;
  }
};
