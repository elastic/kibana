/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type { HealthTimings } from '../../../../../../common/api/detection_engine/rule_monitoring';

export const calculateHealthTimings = (requestReceivedAt: IsoDateString): HealthTimings => {
  const requestedAt = moment(requestReceivedAt);
  const processedAt = moment().utc();
  const processingTime = moment.duration(processedAt.diff(requestReceivedAt));

  return {
    requested_at: requestedAt.toISOString(),
    processed_at: processedAt.toISOString(),
    processing_time_ms: processingTime.asMilliseconds(),
  };
};
