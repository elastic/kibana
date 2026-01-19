/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';

export interface ValidateTimeStampArgs {
  completedEventTimeStamp: string | undefined;
  startedEventTimeStamp: string | undefined;
  source: MonitoringEntitySource;
  dataClient: PrivilegeMonitoringDataClient;
}

export const timeStampsAreValid = async ({
  completedEventTimeStamp,
  startedEventTimeStamp,
  source,
  dataClient,
}: ValidateTimeStampArgs) => {
  if (!completedEventTimeStamp || !startedEventTimeStamp) {
    dataClient.log(
      'warn',
      `Missing start/completed markers for source ${source.id}; skipping deletion detection. ` +
        `started=${String(startedEventTimeStamp)} completed=${String(completedEventTimeStamp)}`
    );
    return false;
  }
  if (completedEventTimeStamp <= startedEventTimeStamp) {
    dataClient.log(
      'warn',
      `Completed <= started for source ${source.id} (started=${startedEventTimeStamp}, completed=${completedEventTimeStamp}); skipping.`
    );
    return false;
  }
  return true;
};
