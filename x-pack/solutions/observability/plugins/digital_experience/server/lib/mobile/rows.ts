/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, compact, uniq } from 'lodash';
import { MOBILE_FIELDS, PLATFORM_BY_SDK_NAME } from '../../../common/mobile_panel';
import type { MobilePlatform } from '../../../common/types/applications';
import { MAX_ENVIRONMENTS } from '../constants';
import { withNotDefined } from '../helpers/environment';

/**
 * The rows of the mobile queries. A column every row has null for is dropped from the response,
 * so any value can be missing.
 */
export type EnvironmentRow = {
  docs: number;
  [MOBILE_FIELDS.environment]: string | null;
  [MOBILE_FIELDS.environmentName]: string | null;
};
export type ReleaseRow = { release: string | null; sessions: number };
export type PlatformRow = { [MOBILE_FIELDS.sdkName]: string | null; docs: number };

/** The platforms of `telemetry.sdk.name` values, sorted and without repeats; other SDKs are left out. */
export const toPlatforms = (sdkNames: string | Array<string | null> | null | undefined) =>
  uniq(
    compact(castArray(sdkNames)).flatMap((sdkName): MobilePlatform[] => {
      const platform = PLATFORM_BY_SDK_NAME[sdkName.toLowerCase()];
      return platform ? [platform] : [];
    })
  ).sort();

/** The releases of rows, in their order. */
export const toReleases = (rows: ReleaseRow[]): string[] => compact(rows.map(({ release }) => release));

/**
 * The environments of rows grouped by both environment fields, "Not defined" included when a row
 * has neither, as the web sources list them.
 */
export const toEnvironments = (rows: EnvironmentRow[]): string[] => {
  const names = uniq(
    rows.flatMap((row) => compact([row[MOBILE_FIELDS.environment], row[MOBILE_FIELDS.environmentName]]))
  );
  const notDefined = rows
    .filter(
      (row) => !row[MOBILE_FIELDS.environment] && !row[MOBILE_FIELDS.environmentName]
    )
    .reduce((total, { docs }) => total + (docs ?? 0), 0);
  // Rows come most used first, so the cap keeps the most used names, as the web sources' terms do.
  return withNotDefined(names.slice(0, MAX_ENVIRONMENTS), notDefined);
};
