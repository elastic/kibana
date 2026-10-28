/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
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

const secretConnectionsConfig = schema.object({
  // Off where private-location agents cannot resolve references yet.
  enabled: schema.boolean({ defaultValue: true }),
  // Hostnames a secret provider (Vault) connection may point at. `*` allows any.
  allowedHosts: schema.arrayOf(schema.string({ minLength: 1, maxLength: 253 }), {
    defaultValue: ['*'],
    maxSize: 1000,
  }),
});

const uptimeConfig = schema.object({
  index: schema.maybe(schema.string()),
  service: schema.maybe(serviceConfig),
  secretConnections: schema.maybe(secretConnectionsConfig),
  enabled: schema.boolean({ defaultValue: true }),
});

export const config: PluginConfigDescriptor = {
  schema: uptimeConfig,
  exposeToBrowser: {
    secretConnections: { enabled: true },
  },
  deprecations: ({ renameFromRoot, unused }) => [
    // Must run first so the `unused` checks below see the renamed keys.
    renameFromRoot('xpack.uptime', 'xpack.synthetics', { level: 'warning' }),
    unused('experimental.ccs.enabled', { level: 'warning' }),
    unused('rebalancePrivateLocationShardsTaskEnabled', { level: 'warning' }),
  ],
};

export type UptimeConfig = TypeOf<typeof uptimeConfig>;
export type ServiceConfig = TypeOf<typeof serviceConfig>;

export const isSecretConnectionsEnabled = (syntheticsConfig?: UptimeConfig): boolean =>
  syntheticsConfig?.secretConnections?.enabled ?? true;
