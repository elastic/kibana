/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject } from 'lodash';
import type { ConfigDeprecation, PluginConfigDescriptor } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { sslSchema } from '@kbn/server-http-tools';

const serviceConfig = schema.object({
  username: schema.maybe(schema.string()),
  password: schema.maybe(schema.string()),
  manifestUrl: schema.maybe(schema.string()),
  hosts: schema.maybe(schema.arrayOf(schema.string())),
  syncInterval: schema.maybe(schema.string()),
  tls: schema.maybe(sslSchema),
  devUrl: schema.maybe(schema.string()),
  showExperimentalLocations: schema.maybe(schema.boolean()),
});

const uptimeConfig = schema.object({
  index: schema.maybe(schema.string()),
  service: schema.maybe(serviceConfig),
  enabled: schema.boolean({ defaultValue: true }),
});

const LEGACY_CONFIG_PATH = 'xpack.uptime';
const CONFIG_PATH = 'xpack.synthetics';

const isPlainRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

const getLeaves = (
  value: Record<string, unknown>,
  parentPath = ''
): Array<{ path: string; value: unknown }> =>
  Object.entries(value).flatMap(([key, child]) => {
    const path = parentPath ? `${parentPath}.${key}` : key;
    return isPlainRecord(child) ? getLeaves(child, path) : [{ path, value: child }];
  });

/**
 * Moves each `xpack.uptime.*` setting to `xpack.synthetics.*`. Unlike `renameFromRoot`, settings
 * are migrated individually so the legacy and new namespaces can be set by different sources
 * (e.g. bundled yml and control plane) without the legacy ones being discarded.
 * If a setting is present in both, the new one wins.
 */
const migrateLegacyNamespace: ConfigDeprecation = (config, _fromPath, addDeprecation) => {
  const legacyConfig = get(config, LEGACY_CONFIG_PATH);
  if (!isPlainRecord(legacyConfig)) {
    return;
  }

  const moved: Array<{ path: string; value: unknown }> = [];
  const conflicting: string[] = [];
  getLeaves(legacyConfig).forEach(({ path, value }) => {
    const newPath = `${CONFIG_PATH}.${path}`;
    if (get(config, newPath) === undefined) {
      moved.push({ path: newPath, value });
    } else {
      conflicting.push(path);
    }
  });

  if (moved.length > 0) {
    addDeprecation({
      configPath: LEGACY_CONFIG_PATH,
      title: `Setting "${LEGACY_CONFIG_PATH}" is deprecated`,
      message: `Setting "${LEGACY_CONFIG_PATH}" has been replaced by "${CONFIG_PATH}"`,
      level: 'warning',
      correctiveActions: {
        manualSteps: [
          `Replace "${LEGACY_CONFIG_PATH}" with "${CONFIG_PATH}" in the Kibana config file, CLI flag, or environment variable (in Docker only).`,
        ],
      },
    });
  }

  conflicting.forEach((path) => {
    const legacyPath = `${LEGACY_CONFIG_PATH}.${path}`;
    const newPath = `${CONFIG_PATH}.${path}`;
    addDeprecation({
      configPath: legacyPath,
      title: `Setting "${legacyPath}" is deprecated`,
      message: `Setting "${legacyPath}" has been replaced by "${newPath}". However, both keys are present. Ignoring "${legacyPath}"`,
      level: 'warning',
      correctiveActions: {
        manualSteps: [
          `Make sure "${newPath}" contains the correct value in the config file, CLI flag, or environment variable (in Docker only).`,
          `Remove "${legacyPath}" from the config.`,
        ],
      },
    });
  });

  return { set: moved, unset: [{ path: LEGACY_CONFIG_PATH }] };
};

export const config: PluginConfigDescriptor = {
  schema: uptimeConfig,
  deprecations: ({ unused }) => [
    // Must run first so the `unused` checks below see the migrated keys.
    migrateLegacyNamespace,
    unused('experimental.ccs.enabled', { level: 'warning' }),
    unused('rebalancePrivateLocationShardsTaskEnabled', { level: 'warning' }),
  ],
};

export type UptimeConfig = TypeOf<typeof uptimeConfig>;
export type ServiceConfig = TypeOf<typeof serviceConfig>;
