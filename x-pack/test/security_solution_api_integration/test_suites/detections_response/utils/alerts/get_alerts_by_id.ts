/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL as DETECTION_ENGINE_QUERY_ALERTS_URL } from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from '../count_down_test';
import { getQueryAlertsId } from './get_query_alerts_ids';

/**
 * Given a single rule id this will return only alerts based on that rule id.
 * @param supertest agent
 * @param ids Rule id
 */
export const getAlertsById = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  id: string
): Promise<SearchResponse<DetectionAlert>> => {
  const alertsOpen = await countDownTest<SearchResponse<DetectionAlert>>(
    async () => {
      const response = await supertest
        .post(DETECTION_ENGINE_QUERY_ALERTS_URL)
        .set('kbn-xsrf', 'true')
        .send(getQueryAlertsId([id]));
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
    'getAlertsById',
    log
  );
  if (alertsOpen == null) {
    throw new Error('Alerts not defined after countdown, cannot continue');
  } else {
    return alertsOpen;
  }
};
