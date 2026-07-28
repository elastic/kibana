/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';
import { ConfigKey, SourceType } from '../../../../../../../common/runtime_types';

export const monitorUsesPublicLocations = (monitor: EncryptedSyntheticsSavedMonitor): boolean =>
  (monitor[ConfigKey.LOCATIONS] ?? []).some((location) => location.isServiceManaged);

/**
 * A monitor can be bulk-edited from the Management table only when it mirrors
 * what the row-level controls allow:
 *  - it is `ui`-origin (project/terraform monitors are rejected server-side), and
 *  - the user can act on its locations (public/Elastic-managed locations require
 *    the `elasticManagedLocationsEnabled` capability).
 *
 * Keeping this in one place lets the bulk-actions menu, the confirm modal, and
 * their tests agree on which monitors are eligible.
 */
export const isMonitorBulkEditable = (
  monitor: EncryptedSyntheticsSavedMonitor,
  canUsePublicLocations: boolean
): boolean => {
  if (monitor[ConfigKey.MONITOR_SOURCE_TYPE] !== SourceType.UI) {
    return false;
  }
  if (monitorUsesPublicLocations(monitor) && !canUsePublicLocations) {
    return false;
  }
  return true;
};
