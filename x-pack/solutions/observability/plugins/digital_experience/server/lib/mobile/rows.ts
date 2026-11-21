/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, compact, sortBy, uniq } from 'lodash';
import { ENVIRONMENT_NOT_DEFINED_VALUE } from '@kbn/apm-types';
import { isMobilePlatform } from '../../../common/application_source';
import { MOBILE_FIELDS, RESULT_COLUMNS } from '../../../common/mobile/fields';
import type { MobilePlatform } from '../../../common/types/applications';
import {
  MAX_ENVIRONMENTS,
  MAX_ENVIRONMENT_LENGTH,
  MAX_OS_NAME_LENGTH,
  MAX_RELEASE_LENGTH,
} from '../constants';
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

/** Values the KPI route accepts as a filter: an option longer than its limit would fail it. */
const accepted = (values: Array<string | null>, maxLength: number): string[] =>
  compact(values).filter((value) => value.length <= maxLength);

/** The OS names of rows, in their order. */
export const toOsNames = (rows: OsRow[]): string[] =>
  uniq(
    accepted(
      rows.map(({ [RESULT_COLUMNS.osName]: osName }) => osName),
      MAX_OS_NAME_LENGTH
    )
  );

/** The releases of rows, in their order. */
export const toReleases = (rows: ReleaseRow[]): string[] =>
  accepted(
    rows.map(({ [RESULT_COLUMNS.release]: release }) => release),
    MAX_RELEASE_LENGTH
  );

/** "Not defined" as the KPI filter (`withEnvironment`) applies it: APM's sentinel, or neither field. */
const isEnvironmentNotDefined = (row: EnvironmentRow): boolean =>
  row[MOBILE_FIELDS.environment] === ENVIRONMENT_NOT_DEFINED_VALUE ||
  (!row[MOBILE_FIELDS.environment] && !row[MOBILE_FIELDS.environmentName]);

/**
 * The environments of rows grouped by both environment fields, "Not defined" included when a row
 * is, as the web sources list them.
 */
export const toEnvironments = (rows: EnvironmentRow[]): string[] => {
  const names = uniq(
    accepted(
      rows.flatMap((row) => [row[MOBILE_FIELDS.environment], row[MOBILE_FIELDS.environmentName]]),
      MAX_ENVIRONMENT_LENGTH
    )
  );
  const notDefined = rows
    .filter(isEnvironmentNotDefined)
    .reduce((total, { [RESULT_COLUMNS.docs]: docs }) => total + (docs ?? 0), 0);
  // Rows come most used first, so the cap keeps the most used names, as the web sources' terms do.
  return withNotDefined(names.slice(0, MAX_ENVIRONMENTS), notDefined);
};
