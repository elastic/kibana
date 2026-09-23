/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewStatusMetaData } from '../runtime_types';

/**
 * CCS/CPS and Heartbeat overview rows are one location each. A `remote` /
 * `heartbeat` tag on a config with more than one location is a local
 * SO-backed monitor whose winning ping for one location resolved through a
 * linked cluster — treat it as local, not an external row.
 *
 * Must stay aligned with `placeExternalConfig` in overview_status_service.
 */
export const isSingleLocationExternalOverviewRow = (
  config: Pick<OverviewStatusMetaData, 'origin' | 'remote' | 'locations'>
): boolean =>
  Boolean(
    config.locations[0]?.id &&
      config.locations.length <= 1 &&
      (config.remote?.remoteName || config.origin === 'heartbeat')
  );

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
  if (!locationId || !isSingleLocationExternalOverviewRow(config)) {
    return config.configId;
  }
  if (config.remote?.remoteName) {
    return `${config.remote.remoteName}-${config.configId}-${locationId}`;
  }
  return `heartbeat-${config.configId}-${locationId}`;
};
