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
import type { FacetBucket } from '../../../common/sessions';
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

/**
 * The OS names of rows with their sessions, in their order, for the OS picker; an OS name on two
 * platforms is one option with the sessions of both.
 */
export const toOsNames = (rows: OsRow[]): FacetBucket[] => {
  const sessionsByName = new Map<string, number>();
  rows.forEach(({ [RESULT_COLUMNS.osName]: osName, [RESULT_COLUMNS.sessions]: sessions }) => {
    if (osName && accepted([osName], MAX_OS_NAME_LENGTH).length > 0) {
      sessionsByName.set(osName, (sessionsByName.get(osName) ?? 0) + (sessions ?? 0));
    }
  });
  return [...sessionsByName].map(([key, count]) => ({ key, count }));
};

/** The releases of rows with their sessions, in their order, for the release picker. */
export const toReleases = (rows: ReleaseRow[]): FacetBucket[] =>
  rows.flatMap(({ [RESULT_COLUMNS.release]: release, [RESULT_COLUMNS.sessions]: sessions }) =>
    release && accepted([release], MAX_RELEASE_LENGTH).length > 0
      ? [{ key: release, count: sessions ?? 0 }]
      : []
  );

/** A release the KPI route accepts as a filter, or `null`. */
export const toRelease = (release: string | null | undefined): string | null =>
  accepted([release ?? null], MAX_RELEASE_LENGTH)[0] ?? null;

/**
 * "Not defined" as the KPI filters (`withEnvironment`, `environmentNotDefinedFilter`) apply it:
 * APM's sentinel, or neither field indexed. An indexed `""` is a value to them, not a missing one.
 */
const isEnvironmentNotDefined = (row: EnvironmentRow): boolean =>
  row[MOBILE_FIELDS.environment] === ENVIRONMENT_NOT_DEFINED_VALUE ||
  (row[MOBILE_FIELDS.environment] == null && row[MOBILE_FIELDS.environmentName] == null);

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
