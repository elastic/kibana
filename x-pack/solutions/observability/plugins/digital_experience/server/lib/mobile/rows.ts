/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, compact, sortBy, uniq } from 'lodash';
import { isMobilePlatform } from '../../../common/application_source';
import type { RESULT_COLUMNS } from '../../../common/mobile/fields';
import { MOBILE_FIELDS } from '../../../common/mobile/fields';
import type { MobilePlatform } from '../../../common/types/applications';
import { MAX_ENVIRONMENTS } from '../constants';
import { withNotDefined } from '../helpers/environment';

/**
 * The rows of the mobile queries. A column every row has null for is dropped from the response,
 * so any value can be missing.
 */
export interface EnvironmentRow {
  [RESULT_COLUMNS.docs]: number;
  [MOBILE_FIELDS.environment]: string | null;
  [MOBILE_FIELDS.environmentName]: string | null;
}
export interface ReleaseRow {
  [RESULT_COLUMNS.release]: string | null;
  [RESULT_COLUMNS.sessions]: number;
}
export interface OsRow {
  [RESULT_COLUMNS.osName]: string | null;
  [RESULT_COLUMNS.platform]: string | null;
  [RESULT_COLUMNS.sessions]: number;
}

/** The platforms of `values`, sorted: a `VALUES` column is a single value when there is one. */
export const toPlatforms = (values: string | string[] | null | undefined): MobilePlatform[] =>
  sortBy(uniq(castArray(values ?? []).filter(isMobilePlatform)));

/** The OS names of rows, in their order. */
export const toOsNames = (rows: OsRow[]): string[] =>
  uniq(compact(rows.map(({ os_name: osName }) => osName)));

/** The releases of rows, in their order. */
export const toReleases = (rows: ReleaseRow[]): string[] =>
  compact(rows.map(({ release }) => release));

/**
 * The environments of rows grouped by both environment fields, "Not defined" included when a row
 * has neither, as the web sources list them.
 */
export const toEnvironments = (rows: EnvironmentRow[]): string[] => {
  const names = uniq(
    rows.flatMap((row) =>
      compact([row[MOBILE_FIELDS.environment], row[MOBILE_FIELDS.environmentName]])
    )
  );
  const notDefined = rows
    .filter((row) => !row[MOBILE_FIELDS.environment] && !row[MOBILE_FIELDS.environmentName])
    .reduce((total, { docs }) => total + (docs ?? 0), 0);
  // Rows come most used first, so the cap keeps the most used names, as the web sources' terms do.
  return withNotDefined(names.slice(0, MAX_ENVIRONMENTS), notDefined);
};
