/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroFeatureFlagsSnapshotPayload } from '../event_types';
import { SNAPSHOT_FLAGS } from './constants';
import type { SpaceSnapshot } from './types';

/** Counts, for every allowlisted flag, the spaces where it is enabled. */
export const buildFeatureFlagsSnapshotPayload = ({
  serviceAccountsEnabled,
  snapshotDay,
  spaces,
}: {
  /** Whether Kibana service accounts are on, from the same check as the autonomy snapshot. */
  serviceAccountsEnabled: boolean;
  snapshotDay: string;
  spaces: readonly SpaceSnapshot[];
}): AlertZeroFeatureFlagsSnapshotPayload => ({
  flags: SNAPSHOT_FLAGS.map((flag) => ({
    enabled_space_count: spaces.filter(({ flags }) => flags[flag]).length,
    flag,
  })),
  service_accounts_enabled: serviceAccountsEnabled,
  snapshot_day: snapshotDay,
  space_count: spaces.length,
});
