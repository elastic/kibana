/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLICATION_SOURCE, APPLICATION_TYPE } from '../../../../common/application_source';
import { MOBILE_FIELDS, RESULT_COLUMNS } from '../../../../common/mobile/fields';
import type { MobileApplicationSummary } from '../../../../common/types/applications';
import { toPlatforms } from '../../../lib/mobile/rows';

/** One row of `applicationsQuery`. */
export interface MobileApplicationRow {
  [MOBILE_FIELDS.serviceName]: string;
  [RESULT_COLUMNS.sessions]: number;
  [RESULT_COLUMNS.users]: number;
  [RESULT_COLUMNS.exceptions]: number;
  /** One value when the application reported on one platform. */
  [RESULT_COLUMNS.platforms]: string | string[] | null;
  [RESULT_COLUMNS.lastSeen]: string | null;
}

/** One row of `applicationsQuery` as an application of the list. */
export const toApplication = (
  row: MobileApplicationRow,
  { environments, latest }: { environments: string[]; latest: string | null }
): MobileApplicationSummary => {
  const {
    [MOBILE_FIELDS.serviceName]: serviceName,
    [RESULT_COLUMNS.sessions]: sessions = 0,
    [RESULT_COLUMNS.users]: users = 0,
    [RESULT_COLUMNS.exceptions]: exceptions = 0,
    [RESULT_COLUMNS.platforms]: platforms,
    [RESULT_COLUMNS.lastSeen]: lastSeen,
  } = row;
  return {
    serviceName,
    source: APPLICATION_SOURCE.otel,
    applicationType: APPLICATION_TYPE.mobile,
    platforms: toPlatforms(platforms),
    environments,
    latestRelease: latest,
    sessions: { count: sessions },
    users: { count: users },
    // A crash isn't defined yet (#64) and session start doesn't reach the SDKs: not enough data.
    crashFreeSessions: { value: null, previous: null, delta: null },
    errorRate: sessions > 0 ? exceptions / sessions : null,
    lastSeen: lastSeen ?? null,
  };
};
