/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect, newestValue, oldestValue } from './field_retention_operations';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';

// Mostly copied from x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/host.ts

export const hostEntityDefinition: EntityDefinitionWithoutId = {
  type: 'host',
  name: `Security 'host' Entity Store Definition`,
  identityField: {
    requiresOneOfFields: ['host.entity.id', 'host.id', 'host.name', 'host.hostname'],
    euidFields: [
      [{ field: 'host.entity.id' }],
      [{ field: 'host.id' }],
      [{ field: 'host.name' }, { separator: '.' }, { field: 'host.domain' }],
      [{ field: 'host.hostname' }, { separator: '.' }, { field: 'host.domain' }],
      [{ field: 'host.name' }],
      [{ field: 'host.hostname' }],
    ],
  },
  entityTypeFallback: 'Host',
  indexPatterns: [],
  fields: [
    newestValue({ destination: 'entity.name', source: 'host.name' }),
    oldestValue({ source: 'host.entity.id' }),

    collect({ source: 'host.name' }),
    collect({ source: 'host.domain' }),
    collect({ source: 'host.hostname' }),
    collect({ source: 'host.id' }),
    collect({
      source: 'host.os.name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    collect({ source: 'host.os.type' }),
    collect({
      source: 'host.ip',
      mapping: {
        type: 'ip',
      },
    }),
    collect({ source: 'host.mac' }),
    collect({ source: 'host.type' }),
    collect({ source: 'host.architecture' }),
    newestValue({ source: 'host.boot.id' }),
    newestValue({
      source: 'host.cpu.usage',
      mapping: { type: 'scaled_float', scaling_factor: 1000 },
    }),
    newestValue({ source: 'host.disk.read.bytes', mapping: { type: 'long' } }),
    newestValue({ source: 'host.disk.write.bytes', mapping: { type: 'long' } }),
    newestValue({ source: 'host.network.egress.bytes', mapping: { type: 'long' } }),
    newestValue({ source: 'host.network.egress.packets', mapping: { type: 'long' } }),
    newestValue({ source: 'host.network.ingress.bytes', mapping: { type: 'long' } }),
    newestValue({ source: 'host.network.ingress.packets', mapping: { type: 'long' } }),
    newestValue({ source: 'host.uptime', mapping: { type: 'long' } }),
    newestValue({ source: 'host.pid_ns_ino' }),
    newestValue({ source: 'host.os.family' }),
    newestValue({ source: 'host.os.full' }),
    newestValue({ source: 'host.os.kernel' }),
    newestValue({ source: 'host.os.platform' }),
    newestValue({ source: 'host.os.version' }),
    newestValue({ source: 'host.geo.city_name' }),
    newestValue({ source: 'host.geo.continent_code' }),
    newestValue({ source: 'host.geo.continent_name' }),
    newestValue({ source: 'host.geo.country_iso_code' }),
    newestValue({ source: 'host.geo.country_name' }),
    // collect({ source: 'host.geo.location', mapping: { type: 'geo_point' } }), // geo_point is not supported in ESQL TOP
    collect({ source: 'host.geo.name' }),
    collect({ source: 'host.geo.postal_code' }),
    collect({ source: 'host.geo.region_iso_code' }),
    collect({ source: 'host.geo.region_name' }),
    collect({ source: 'host.geo.timezone' }),
    ...getCommonFieldDescriptions('host'),
    ...getEntityFieldsDescriptions('host'),
  ],
} as const satisfies EntityDefinitionWithoutId;
