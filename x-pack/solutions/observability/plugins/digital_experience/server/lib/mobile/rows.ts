/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLATFORM_BY_SDK_NAME } from '../../../common/mobile_panel';
import { ENVIRONMENT_FIELDS } from '../../../common/otel_data';
import type { MobilePlatform } from '../../../common/types/applications';
import type { EsqlRow } from '../../services/sessions/summary_documents';
import { MAX_ENVIRONMENTS } from '../constants';
import { withNotDefined } from '../helpers/environment';

/** A numeric ES|QL value, 0 when missing. */
export const toNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);

const asArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

/** The platforms of `telemetry.sdk.name` values, sorted and without repeats; other SDKs are left out. */
export const toPlatforms = (sdkNames: unknown): MobilePlatform[] => {
  const platforms = asArray(sdkNames as string | string[] | null).flatMap((sdkName) => {
    const platform = PLATFORM_BY_SDK_NAME[sdkName.toLowerCase()];
    return platform ? [platform] : [];
  });
  return [...new Set(platforms)].sort();
};

/** The `release` of rows, in their order. */
export const toReleases = (rows: EsqlRow[]): string[] =>
  rows.flatMap(({ release }) => (typeof release === 'string' ? [release] : []));

/**
 * The environments of rows grouped by both environment fields, "Not defined" included when a row
 * has neither, as the web sources list them.
 */
export const toEnvironments = (rows: EsqlRow[]): string[] => {
  let notDefined = 0;
  const names = new Set<string>();
  rows.forEach((row) => {
    const values = ENVIRONMENT_FIELDS.flatMap((field) => {
      const value = row[field];
      return typeof value === 'string' ? [value] : [];
    });
    if (values.length === 0) {
      notDefined += toNumber(row.docs);
    }
    values.forEach((value) => names.add(value));
  });
  // Rows come most used first, so the cap keeps the most used names, as the web sources' terms do.
  return withNotDefined([...names].slice(0, MAX_ENVIRONMENTS), notDefined);
};
