/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGlobalTime } from '../../common/containers/use_global_time';
import {
  ENTITY_ANALYTICS_ALERTS_FROM,
  ENTITY_ANALYTICS_DEFAULT_TIMERANGE_TO,
  ENTITY_ANALYTICS_TABLE_ID,
} from '../components/home/constants';
import { getScopeFlyoutTimeRange, type ScopeTimeRange } from '../common/scope_time_ranges';

/** Scopes that pin alerts (only) to a fixed window; whole-flyout scopes live in `scope_time_ranges`. */
const SCOPE_ALERT_TIME_RANGE_OVERRIDES: Readonly<Record<string, ScopeTimeRange>> = {
  [ENTITY_ANALYTICS_TABLE_ID]: {
    from: ENTITY_ANALYTICS_ALERTS_FROM,
    to: ENTITY_ANALYTICS_DEFAULT_TIMERANGE_TO,
  },
};

/**
 * Returns `{ from, to }` for alert queries. A window pinned for the whole flyout by `scopeId`, or
 * an alert-only override for it, wins; otherwise falls back to the Kibana global time range.
 */
export const useAlertTimeRange = (scopeId?: string): { from: string; to: string } => {
  const { to: globalTo, from: globalFrom } = useGlobalTime();
  const scopeOverride =
    getScopeFlyoutTimeRange(scopeId) ??
    (scopeId ? SCOPE_ALERT_TIME_RANGE_OVERRIDES[scopeId] : undefined);
  return {
    from: scopeOverride?.from ?? globalFrom,
    to: scopeOverride?.to ?? globalTo,
  };
};
