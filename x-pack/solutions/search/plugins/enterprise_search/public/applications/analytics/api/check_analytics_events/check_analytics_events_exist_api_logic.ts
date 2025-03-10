/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsEventsExist } from '../../../../../common/types/analytics';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface AnalyticsEventsExistApiLogicArgs {
  indexName: string;
}

export type AnalyticsEventsExistApiLogicResponse = AnalyticsEventsExist;

export const checkAnalyticsEventsExist = async ({
  indexName,
}: AnalyticsEventsExistApiLogicArgs): Promise<AnalyticsEventsExistApiLogicResponse> => {
  const { http } = HttpLogic.values;
  const route = `/internal/elasticsearch/analytics/collection/${indexName}/events/exist`;
  const response = await http.get<AnalyticsEventsExist>(route);

  return response;
};

export const AnalyticsEventsExistAPILogic = createApiLogic(
  ['analytics', 'analytics_events_exist_api_logic'],
  checkAnalyticsEventsExist
);
