/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MobileApplicationSummary,
  MobilePlatform,
} from '../../../../common/types/applications';
import type { EsqlRow } from '../../../services/sessions/summary_documents';
import { normalizeVersion } from './normalize_version';

const PLATFORM_BY_SDK_NAME: Readonly<Record<string, MobilePlatform>> = {
  android: 'android',
  ios: 'ios',
};

const asArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const toNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);

/** The platforms of `telemetry.sdk.name` values, sorted and without repeats; other SDKs are left out. */
export const toPlatforms = (sdkNames: unknown): MobilePlatform[] => {
  const platforms = asArray(sdkNames as string | string[] | null).flatMap((sdkName) => {
    const platform = PLATFORM_BY_SDK_NAME[sdkName.toLowerCase()];
    return platform ? [platform] : [];
  });
  return [...new Set(platforms)].sort();
};

/**
 * The normalized version with the most sessions of one application; ties go to the higher version
 * name. A session on a version with two builds counts once per raw version, so builds add up.
 */
export const latestRelease = (
  releases: Array<{ version: string | null; sessions: number }>
): string | null => {
  const sessionsByRelease = new Map<string, number>();
  releases.forEach(({ version, sessions }) => {
    const release = version ? normalizeVersion(version) : '';
    if (release) {
      sessionsByRelease.set(release, (sessionsByRelease.get(release) ?? 0) + sessions);
    }
  });
  const [top] = [...sessionsByRelease].sort(
    ([versionA, a], [versionB, b]) =>
      b - a || versionB.localeCompare(versionA, undefined, { numeric: true })
  );
  return top ? top[0] : null;
};

export const toApplication = (
  row: EsqlRow,
  { environments, latest }: { environments: string[]; latest: string | null }
): MobileApplicationSummary => {
  const sessions = toNumber(row.sessions);
  const exceptions = toNumber(row.exceptions);
  return {
    serviceName: String(row['service.name']),
    source: 'mobile',
    environments,
    platforms: toPlatforms(row.platforms),
    latestRelease: latest,
    sessions: { count: sessions },
    users: { count: toNumber(row.users) },
    // A crash isn't defined yet (#64) and session start doesn't reach the SDKs: not enough data.
    crashFreeSessions: { value: null, previous: null, delta: null },
    errorRate: sessions > 0 ? exceptions / sessions : null,
    lastSeen: typeof row.last_seen === 'string' ? row.last_seen : null,
  };
};
