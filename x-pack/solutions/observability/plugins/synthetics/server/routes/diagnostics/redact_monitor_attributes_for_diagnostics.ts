/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  ConfigKey,
  LegacyConfigKey,
  secretKeys,
} from '../../../common/constants/monitor_management';

const LEGACY_SECRET_ATTRIBUTE_KEYS = [
  LegacyConfigKey.SOURCE_ZIP_USERNAME,
  LegacyConfigKey.SOURCE_ZIP_PASSWORD,
  LegacyConfigKey.ZIP_URL_TLS_KEY,
  LegacyConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE,
] as const;

export const MONITOR_ATTRIBUTES_REDACTED_FOR_DIAGNOSTICS = [
  'secrets',
  ...secretKeys,
  ...LEGACY_SECRET_ATTRIBUTE_KEYS,
] as const;

export const redactMonitorAttributesForDiagnostics = <T extends Record<string, unknown>>(
  attributes: T
): Omit<T, (typeof MONITOR_ATTRIBUTES_REDACTED_FOR_DIAGNOSTICS)[number]> =>
  omit(attributes, MONITOR_ATTRIBUTES_REDACTED_FOR_DIAGNOSTICS) as Omit<
    T,
    (typeof MONITOR_ATTRIBUTES_REDACTED_FOR_DIAGNOSTICS)[number]
  >;

export const countMonitorsByLocationId = (
  monitors: Array<{ attributes: Record<string, unknown> }>
): Array<{ locationId: string; monitorCount: number }> => {
  const counts: Record<string, number> = {};
  for (const monitor of monitors) {
    const locations = monitor.attributes[ConfigKey.LOCATIONS];
    if (!Array.isArray(locations)) {
      continue;
    }
    for (const loc of locations) {
      if (loc && typeof loc === 'object' && 'id' in loc && typeof loc.id === 'string') {
        counts[loc.id] = (counts[loc.id] ?? 0) + 1;
      }
    }
  }
  return Object.entries(counts).map(([locationId, monitorCount]) => ({ locationId, monitorCount }));
};
