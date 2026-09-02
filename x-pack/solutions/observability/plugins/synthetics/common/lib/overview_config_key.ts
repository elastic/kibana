/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewStatusMetaData } from '../runtime_types';

/**
 * Stable identity for one overview row. Local saved-object monitors are one
 * row per config (all locations grouped). CCS/CPS and Heartbeat rows are
 * already one location each, so the key must include cluster/origin and
 * location — otherwise pagination merge keyed on `configId` drops the second
 * copy of an imported monitor.
 *
 * Must stay aligned with `placeExternalConfig` in overview_status_service.
 */
export const getOverviewConfigKey = (
  config: Pick<OverviewStatusMetaData, 'configId' | 'origin' | 'remote' | 'locations'>
): string => {
  const locationId = config.locations[0]?.id;
  if (config.remote?.remoteName && locationId) {
    return `${config.remote.remoteName}-${config.configId}-${locationId}`;
  }
  if (config.origin === 'heartbeat' && locationId) {
    return `heartbeat-${config.configId}-${locationId}`;
  }
  return config.configId;
};
