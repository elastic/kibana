/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL as DETECTION_ENGINE_QUERY_ALERTS_URL } from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from '../count_down_test';

/**
 * This function invokes the detection engine query alerts API to search for alerts.
 * It will retry until the alerts are returned or a timeout occurs.
 * @param supertest agent
 * @param log ToolingLog instance for logging
 * @param searchBody The body of the search request, which should conform to the {@link SearchAlertsRequestBody} schema
 */
export const searchAlerts = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  searchBody: object
): Promise<SearchResponse<DetectionAlert>> => {
  const alertsOpen = await countDownTest<SearchResponse<DetectionAlert>>(
    async () => {
      const response = await supertest
        .post(DETECTION_ENGINE_QUERY_ALERTS_URL)
        .set('kbn-xsrf', 'true')
        .send(searchBody);
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
    'searchAlerts',
    log
  );
  if (alertsOpen == null) {
    throw new Error('Alerts were not found in alotted time');
  } else {
    return alertsOpen;
  }
};
