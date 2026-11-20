/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLICATION_SOURCE } from '../../../../common/application_source';
import { MOBILE_FIELDS } from '../../../../common/mobile_panel';
import type { MobileApplicationSummary } from '../../../../common/types/applications';
import { toPlatforms } from '../../../lib/mobile/rows';

/** One row of `applicationsQuery`. */
export type MobileApplicationRow = {
  [MOBILE_FIELDS.serviceName]: string;
  sessions: number;
  users: number;
  exceptions: number;
  platforms: string | string[] | null;
  last_seen: string | null;
};

/** One row of `applicationsQuery` as an application of the list. */
export const toApplication = (
  row: MobileApplicationRow,
  { environments, latest }: { environments: string[]; latest: string | null }
): MobileApplicationSummary => {
  const { sessions = 0, users = 0, exceptions = 0, platforms, last_seen: lastSeen } = row;
  return {
    serviceName: row[MOBILE_FIELDS.serviceName],
    source: APPLICATION_SOURCE.mobile,
    environments,
    platforms: toPlatforms(platforms),
    latestRelease: latest,
    sessions: { count: sessions },
    users: { count: users },
    // A crash isn't defined yet (#64) and session start doesn't reach the SDKs: not enough data.
    crashFreeSessions: { value: null, previous: null, delta: null },
    errorRate: sessions > 0 ? exceptions / sessions : null,
    lastSeen: lastSeen ?? null,
  };
};
