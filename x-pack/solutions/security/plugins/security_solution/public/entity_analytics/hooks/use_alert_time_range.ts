/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGlobalTime } from '../../common/containers/use_global_time';
import { SCOPE_ALERT_TIME_RANGE_OVERRIDES } from '../common/alert_time_range_overrides';

/**
 * Returns `{ from, to }` for alert queries. When `scopeId` has a registered
 * entry in {@link SCOPE_ALERT_TIME_RANGE_OVERRIDES} that window wins; otherwise
 * falls back to the Kibana global time range.
 */
export const useAlertTimeRange = (scopeId?: string): { from: string; to: string } => {
  const { to: globalTo, from: globalFrom } = useGlobalTime();
  const scopeOverride = scopeId ? SCOPE_ALERT_TIME_RANGE_OVERRIDES[scopeId] : undefined;
  return {
    from: scopeOverride?.from ?? globalFrom,
    to: scopeOverride?.to ?? globalTo,
  };
};
