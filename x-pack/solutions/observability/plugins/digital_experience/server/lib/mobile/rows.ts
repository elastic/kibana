/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MOBILE_FIELDS,
  PLATFORM_BY_SDK_NAME,
  mappedEnvironmentFields,
} from '../../../common/mobile_panel';
import type { MappedFields } from '../../../common/mobile_panel';
import type { MobilePlatform } from '../../../common/types/applications';
import type { EsqlRow } from '../../services/sessions/summary_documents';
import { MAX_ENVIRONMENTS } from '../constants';
import { withNotDefined } from '../helpers/environment';
import { normalizeVersion } from './normalize_version';

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

/**
 * The normalized releases, most sessions first; ties go to the higher version name. A session on a
 * release with two builds counts once per raw version, so builds add up.
 */
export const rankReleases = (
  releases: Array<{ version: string | null; sessions: number }>
): string[] => {
  const sessionsByRelease = new Map<string, number>();
  releases.forEach(({ version, sessions }) => {
    const release = version ? normalizeVersion(version) : '';
    if (release) {
      sessionsByRelease.set(release, (sessionsByRelease.get(release) ?? 0) + sessions);
    }
  });
  return [...sessionsByRelease]
    .sort(
      ([versionA, a], [versionB, b]) =>
        b - a || versionB.localeCompare(versionA, undefined, { numeric: true })
    )
    .map(([release]) => release);
};

/** The release with the most sessions, `null` without a version. */
export const latestRelease = (
  releases: Array<{ version: string | null; sessions: number }>
): string | null => rankReleases(releases)[0] ?? null;

/** A row's `service.version` and sessions, for `rankReleases`. */
export const toRelease = (row: EsqlRow): { version: string | null; sessions: number } => {
  const version = row[MOBILE_FIELDS.serviceVersion];
  return {
    version: typeof version === 'string' ? version : null,
    sessions: toNumber(row.sessions),
  };
};

/**
 * The environments of rows grouped by the mapped environment fields, "Not defined" included when a
 * row has none of them, as the web sources list them.
 */
export const toEnvironments = (rows: EsqlRow[], mapped: MappedFields): string[] => {
  const fields = mappedEnvironmentFields(mapped);
  let notDefined = 0;
  const names = new Set<string>();
  rows.forEach((row) => {
    const values = fields.flatMap((field) =>
      typeof row[field] === 'string' ? [row[field] as string] : []
    );
    if (values.length === 0) {
      notDefined += toNumber(row.docs);
    }
    values.forEach((value) => names.add(value));
  });
  // Rows come most used first, so the cap keeps the most used names, as the web sources' terms do.
  return withNotDefined([...names].slice(0, MAX_ENVIRONMENTS), notDefined);
};
