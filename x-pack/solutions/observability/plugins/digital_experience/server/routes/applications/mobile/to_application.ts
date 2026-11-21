/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, uniq } from 'lodash';
import { APPLICATION_SOURCE, APPLICATION_TYPE } from '../../../../common/application_source';
import { MOBILE_FIELDS, RESULT_COLUMNS } from '../../../../common/mobile/fields';
import { toComparedValue } from '../../../../common/mobile/kpis';
import type { MobileApplicationSummary } from '../../../../common/types/applications';
import { toPlatforms } from '../../../lib/mobile/rows';
import { MAX_ENVIRONMENTS_PER_APPLICATION } from '../constants';

/** A `VALUES` column: a single value when there is one. */
type ValuesColumn = string | string[] | null;

/** One row of `applicationsQuery`. */
export interface MobileApplicationRow {
  [MOBILE_FIELDS.serviceName]: string;
  [RESULT_COLUMNS.sessions]: number;
  [RESULT_COLUMNS.users]: number;
  [RESULT_COLUMNS.exceptions]: number;
  [RESULT_COLUMNS.platforms]: ValuesColumn;
  [RESULT_COLUMNS.environments]?: ValuesColumn;
  [RESULT_COLUMNS.environmentNames]?: ValuesColumn;
  [RESULT_COLUMNS.lastSeen]: string | null;
}

/** The environments of both fields, up to `MAX_ENVIRONMENTS_PER_APPLICATION` as the web rows. */
const toApplicationEnvironments = (...columns: Array<ValuesColumn | undefined>): string[] =>
  uniq(columns.flatMap((values) => castArray(values ?? []))).slice(
    0,
    MAX_ENVIRONMENTS_PER_APPLICATION
  );

/** One row of `applicationsQuery` as an application of the list. */
export const toApplication = (
  row: MobileApplicationRow,
  latestRelease: string | null
): MobileApplicationSummary => {
  const {
    [MOBILE_FIELDS.serviceName]: serviceName,
    [RESULT_COLUMNS.sessions]: sessions = 0,
    [RESULT_COLUMNS.users]: users = 0,
    [RESULT_COLUMNS.exceptions]: exceptions = 0,
    [RESULT_COLUMNS.platforms]: platforms,
    [RESULT_COLUMNS.environments]: environments,
    [RESULT_COLUMNS.environmentNames]: environmentNames,
    [RESULT_COLUMNS.lastSeen]: lastSeen,
  } = row;
  return {
    serviceName,
    source: APPLICATION_SOURCE.otel,
    applicationType: APPLICATION_TYPE.mobile,
    platforms: toPlatforms(platforms),
    environments: toApplicationEnvironments(environments, environmentNames),
    latestRelease,
    sessions: { count: sessions },
    users: { count: users },
    // A crash isn't defined yet (#64) and session start doesn't reach the SDKs: not enough data.
    crashFreeSessions: toComparedValue(null, null),
    errorRate: sessions > 0 ? exceptions / sessions : null,
    lastSeen: lastSeen ?? null,
  };
};
