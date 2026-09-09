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
  // A genuine CCS/CPS-only or Heartbeat row is always one location (per the
  // contract above), so a `remote`/`heartbeat` tag on a config with more than
  // one location means it's actually a local, SO-backed multi-location
  // monitor whose winning ping for *one* location happened to resolve through
  // a linked cluster — key it by plain `configId` like any other local
  // monitor instead of the compound remote/heartbeat form.
  if (config.remote?.remoteName && locationId && config.locations.length <= 1) {
    return `${config.remote.remoteName}-${config.configId}-${locationId}`;
  }
  if (config.origin === 'heartbeat' && locationId && config.locations.length <= 1) {
    return `heartbeat-${config.configId}-${locationId}`;
  }
  return config.configId;
};
