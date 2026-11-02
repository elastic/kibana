/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseFetchActiveAlerts } from '../use_fetch_active_alerts';
import { ActiveAlerts } from '../active_alerts';

export const useFetchActiveAlerts = ({
  sloIdsAndInstanceIds = [],
}: {
  sloIdsAndInstanceIds: Array<[string, string]>;
}): UseFetchActiveAlerts => {
  const entries: Array<[{ id: string; instanceId: string }, number]> = sloIdsAndInstanceIds
    .filter((_, index) => index % 2 === 0)
    .map(([sloId, instanceId]) => [{ id: sloId, instanceId }, 2]);
  return {
    isLoading: false,
    isSuccess: false,
    isError: false,
    data: new ActiveAlerts(entries),
  };
};
