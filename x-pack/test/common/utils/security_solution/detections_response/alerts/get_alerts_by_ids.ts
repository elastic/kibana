/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { RiskEnrichmentFields } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_types/utils/enrichments/types';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL as DETECTION_ENGINE_QUERY_ALERTS_URL } from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from '../count_down_test';
import { getQueryAlertsId } from './get_query_alerts_ids';
import { routeWithNamespace } from '../route_with_namespace';

/**
 * Given an array of rule ids this will return only alerts based on that rule id both
 * open and closed
 * @param supertest agent
 * @param ids Array of the rule ids
 */
export const getAlertsByIds = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  ids: string[],
  size?: number,
  namespace?: string
): Promise<SearchResponse<DetectionAlert & RiskEnrichmentFields>> => {
  const alertsOpen = await countDownTest<SearchResponse<DetectionAlert & RiskEnrichmentFields>>(
    async () => {
      const route = routeWithNamespace(DETECTION_ENGINE_QUERY_ALERTS_URL, namespace);
      const response = await supertest
        .post(route)
        .set('kbn-xsrf', 'true')
        .send(getQueryAlertsId(ids, size));
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
    'getAlertsByIds',
    log
  );
  if (alertsOpen == null) {
    throw new Error('Alerts not defined after countdown, cannot continue');
  } else {
    return alertsOpen;
  }
};
