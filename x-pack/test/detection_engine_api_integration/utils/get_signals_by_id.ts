/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/dev-utils';
import type SuperTest from 'supertest';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/detection_engine/schemas/alerts';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from './count_down_test';
import { getQuerySignalsId } from './get_query_signals_ids';

/**
 * Given a single rule id this will return only signals based on that rule id.
 * @param supertest agent
 * @param ids Rule id
 */
export const getSignalsById = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  id: string
): Promise<SearchResponse<DetectionAlert>> => {
  const signalsOpen = await countDownTest<SearchResponse<DetectionAlert>>(
    async () => {
      const response = await supertest
        .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
        .set('kbn-xsrf', 'true')
        .send(getQuerySignalsId([id]));
      if (response.status !== 200) {
        return {
          passed: false,
          returnValue: undefined,
        };
      } else {
        return {
          passed: true,
          returnValue: response.body,
        };
      }
    },
    'getSignalsById',
    log
  );
  if (signalsOpen == null) {
    throw new Error('Signals not defined after countdown, cannot continue');
  } else {
    return signalsOpen;
  }
};
