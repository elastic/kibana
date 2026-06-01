/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverLt from 'semver/functions/lt';

export const STALE_ENDPOINT_PACKAGE_MESSAGE =
  'Your Elastic Defend integration ({installedVersion}) is older than the latest available version ({latestVersion}). Troubleshooting recommendations may be outdated.';

export const isEndpointPackageStale = (
  installedVersion: string | null,
  latestVersion: string | null
): boolean => {
  if (!installedVersion || !latestVersion) return false;
  try {
    return semverLt(installedVersion, latestVersion);
  } catch {
    return false;
  }
};
