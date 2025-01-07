/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type {
  GetSpaceHealthRequest,
  GetSpaceHealthRequestBody,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { validateHealthInterval } from '../health_interval';

export const validateGetSpaceHealthRequest = (
  body: GetSpaceHealthRequestBody
): GetSpaceHealthRequest => {
  const now = moment();
  const interval = validateHealthInterval(body.interval, now);

  return {
    interval,
    debug: body.debug ?? false,
    requestReceivedAt: now.utc().toISOString(),
  };
};
