/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { syntheticsMonitorSOTypes, syntheticsParamType } from '../../common/types/saved_objects';

/**
 * Every monitor is sent in full at least this often, even when nothing changed. Retaining a
 * monitor does not regenerate what the service derives on its own, such as its user agent build.
 */
export const FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * A monitor saved just before the previous sync started may not have been visible to it, for
 * example because of clock skew between Kibana nodes, so it counts as changed once more.
 */
const CHANGED_SINCE_MARGIN_MS = 60 * 1000;

/** What the sync task remembers between runs, stored as flat strings in the task state. */
export interface MonitorSyncState {
  /** When the sync task last started. */
  lastRunAt?: string;
  /** When the last run that pushed everything it had to without a failure started. */
  lastSyncedAt?: string;
  /** When the last such run sent every monitor in full. */
  lastFullSyncAt?: string;
  /** Digest of everything besides the monitors themselves that shapes what is sent. */
  syncFingerprint?: string;
}

export interface SyncFingerprintInputs {
  stackVersion: string;
  licenseType: string;
  licenseIssuedTo: string;
  kibanaUrl?: string;
  esHosts: string[];
  apiKeyId: string;
  /** See {@link getParamsVersion}. */
  paramsVersion: string;
  maintenanceWindows: Array<{ id: string; updatedAt: string }>;
}

/**
 * A change to any of these alters the configuration of monitors that were not edited themselves,
 * or the credentials the service cached them with, so it forces every monitor to be sent in full.
 * Only non-secret identifiers are included, never param values or the API key itself.
 */
export const getSyncFingerprint = ({
  maintenanceWindows,
  ...inputs
}: SyncFingerprintInputs): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        ...inputs,
        maintenanceWindows: [...maintenanceWindows].sort((a, b) => a.id.localeCompare(b.id)),
      })
    )
    .digest('hex');

/** The number of global params and the time the latest one was saved, without decrypting them. */
export const getParamsVersion = async (soClient: ISavedObjectsRepository): Promise<string> => {
  const finder = soClient.createPointInTimeFinder({
    type: syntheticsParamType,
    perPage: 1000,
    namespaces: [ALL_SPACES_ID],
    fields: ['key'],
  });

  let count = 0;
  let latestUpdatedAt = '';
  for await (const { saved_objects: params } of finder.find()) {
    for (const { updated_at: updatedAt } of params) {
      count++;
      if (updatedAt && updatedAt > latestUpdatedAt) {
        latestUpdatedAt = updatedAt;
      }
    }
  }
  await finder.close();

  return `${count}:${latestUpdatedAt}`;
};

export const needsFullSync = ({
  state,
  fingerprint,
  now,
}: {
  state: MonitorSyncState;
  fingerprint: string;
  now: number;
}): boolean => {
  const { lastSyncedAt, lastFullSyncAt, syncFingerprint } = state;
  if (!lastSyncedAt || !lastFullSyncAt || syncFingerprint !== fingerprint) {
    return true;
  }
  // an unparsable timestamp is NaN, which is never less than the interval
  return !(now - Date.parse(lastFullSyncAt) < FULL_SYNC_INTERVAL_MS);
};

export const getChangedSince = (lastSyncedAt: string): string =>
  new Date(Date.parse(lastSyncedAt) - CHANGED_SINCE_MARGIN_MS).toISOString();

export const getChangedMonitorsFilter = (changedSince: string): string =>
  `(${syntheticsMonitorSOTypes
    .map((type) => `${type}.updated_at >= "${changedSince}"`)
    .join(' or ')})`;

/** Negated rather than `updated_at < since`, so a monitor without the field is never skipped. */
export const getUnchangedMonitorsFilter = (changedSince: string): string =>
  `not ${getChangedMonitorsFilter(changedSince)}`;
