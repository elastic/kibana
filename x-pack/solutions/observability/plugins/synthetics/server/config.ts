/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject, mergeWith } from 'lodash';
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

/**
 * Merges `xpack.uptime` into `xpack.synthetics` instead of using `renameFromRoot`, which drops
 * the whole legacy subtree when the new namespace is already set. The two namespaces can come
 * from different sources (e.g. bundled yml and control plane), so non-overlapping settings must
 * survive. `xpack.synthetics` wins on overlaps.
 */
const migrateLegacyNamespace: ConfigDeprecation = (config, _fromPath, addDeprecation) => {
  const legacyConfig = get(config, LEGACY_CONFIG_PATH);
  if (!isPlainObject(legacyConfig)) {
    return;
  }

  const currentConfig = get(config, CONFIG_PATH);
  const message = `Setting "${LEGACY_CONFIG_PATH}" has been replaced by "${CONFIG_PATH}"`;
  addDeprecation({
    configPath: LEGACY_CONFIG_PATH,
    title: `Setting "${LEGACY_CONFIG_PATH}" is deprecated`,
    message:
      currentConfig === undefined
        ? message
        : `${message}. However, both are present. Settings in "${CONFIG_PATH}" take precedence over "${LEGACY_CONFIG_PATH}"`,
    level: 'warning',
    correctiveActions: {
      manualSteps: [
        `Replace "${LEGACY_CONFIG_PATH}" with "${CONFIG_PATH}" in the Kibana config file, CLI flag, or environment variable (in Docker only).`,
      ],
    },
  });

  // Arrays are replaced rather than merged by index.
  const merged = mergeWith({}, legacyConfig, currentConfig, (_, source) =>
    Array.isArray(source) ? source : undefined
  );
  return { set: [{ path: CONFIG_PATH, value: merged }], unset: [{ path: LEGACY_CONFIG_PATH }] };
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
