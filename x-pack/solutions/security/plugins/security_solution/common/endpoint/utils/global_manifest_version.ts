/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { type Moment } from 'moment';
import { getControlledArtifactCutoffDate } from './controlled_artifact_rollout';

export type GlobalManifestVersionStatus =
  | 'unpinned'
  | 'automatic'
  | 'valid'
  | 'invalid_format'
  | 'too_old'
  | 'in_future';

export const isPinnedGlobalManifestVersion = (status: GlobalManifestVersionStatus): boolean =>
  status !== 'unpinned' && status !== 'automatic';

export const classifyGlobalManifestVersion = (value: string): GlobalManifestVersionStatus => {
  if (value === '') {
    return 'unpinned';
  }

  if (value === 'latest') {
    return 'automatic';
  }

  const parsedDate = moment.utc(value, 'YYYY-MM-DD', true);
  if (!parsedDate.isValid()) {
    return 'invalid_format';
  }

  const maxAllowedDate = getControlledArtifactCutoffDate();
  if (parsedDate.startOf('day').isBefore(maxAllowedDate.clone().startOf('day'))) {
    return 'too_old';
  }

  const minAllowedDate = moment.utc().subtract(1, 'day');
  if (parsedDate.isAfter(minAllowedDate)) {
    return 'in_future';
  }

  return 'valid';
};

export const GLOBAL_MANIFEST_VERSION_OUTDATED_DAYS = 30;

export const getGlobalManifestVersionAgeDays = (
  value: string,
  now: Moment = moment.utc()
): number => {
  const versionDate = moment.utc(value, 'YYYY-MM-DD', true);
  return moment.utc(now).startOf('day').diff(versionDate, 'days');
};
