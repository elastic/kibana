/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newestValue } from './field_retention_operations';
import type { EntityDefinitionWithoutId } from './entity_schema';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common_fields';

export const genericEntityDefinition: EntityDefinitionWithoutId = {
  type: 'generic',
  name: `Security 'generic' Entity Store Definition`,
  identityField: {
    requiresOneOfFields: ['entity.id'],
    euidFields: [[{ field: 'entity.id' }]],
  },
  indexPatterns: [],
  fields: [
    // entity.id doesn't need to be mapped because it's the main entity field
    // and it's already mapped by default

    newestValue({ source: `entity.name` }),
    ...getEntityFieldsDescriptions(),

    newestValue({ source: 'cloud.account.id' }),
    newestValue({ source: 'cloud.account.name' }),
    newestValue({ source: 'cloud.availability_zone' }),
    newestValue({ source: 'cloud.instance.id' }),
    newestValue({ source: 'cloud.instance.name' }),
    newestValue({ source: 'cloud.machine.type' }),
    newestValue({ source: 'cloud.project.id' }),
    newestValue({ source: 'cloud.project.name' }),
    newestValue({ source: 'cloud.provider' }),
    newestValue({ source: 'cloud.region' }),
    newestValue({ source: 'cloud.service.name' }),

    newestValue({ source: 'host.architecture' }),
    newestValue({ source: 'host.boot.id' }),
    newestValue({
      source: 'host.cpu.usage',
      mapping: { type: 'scaled_float', scaling_factor: 1000 },
    }),
    newestValue({ source: 'host.disk.read.bytes', mapping: { type: 'long' } }),
    newestValue({ source: 'host.disk.write.bytes', mapping: { type: 'long' } }),
    newestValue({ source: 'host.domain' }),
    newestValue({ source: 'host.hostname' }),
    newestValue({ source: 'host.id' }),
    newestValue({ source: 'host.mac' }),
    newestValue({ source: 'host.name' }),
    newestValue({ source: 'host.network.egress.bytes', mapping: { type: 'long' } }),
    newestValue({ source: 'host.network.egress.packets', mapping: { type: 'long' } }),
    newestValue({ source: 'host.network.ingress.bytes', mapping: { type: 'long' } }),
    newestValue({ source: 'host.network.ingress.packets', mapping: { type: 'long' } }),
    newestValue({ source: 'host.pid_ns_ino' }),
    newestValue({ source: 'host.type' }),
    newestValue({ source: 'host.uptime', mapping: { type: 'long' } }),
    newestValue({
      source: 'host.ip',
      mapping: {
        type: 'ip',
      },
    }),

    newestValue({ source: 'user.domain' }),
    newestValue({ source: 'user.email' }),
    newestValue({ source: 'user.roles' }),
    newestValue({ source: 'user.hash' }),
    newestValue({ source: 'user.id' }),
    newestValue({
      source: 'user.name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    newestValue({
      source: 'user.full_name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),

    newestValue({ source: 'orchestrator.api_version' }),
    newestValue({ source: 'orchestrator.cluster.id' }),
    newestValue({ source: 'orchestrator.cluster.name' }),
    newestValue({ source: 'orchestrator.cluster.url' }),
    newestValue({ source: 'orchestrator.cluster.version' }),
    newestValue({ source: 'orchestrator.namespace' }),
    newestValue({ source: 'orchestrator.organization' }),
    newestValue({ source: 'orchestrator.resource.annotation' }),
    newestValue({ source: 'orchestrator.resource.id' }),
    newestValue({ source: 'orchestrator.resource.ip' }),
    newestValue({ source: 'orchestrator.resource.label' }),
    newestValue({ source: 'orchestrator.resource.name' }),
    newestValue({ source: 'orchestrator.resource.parent.type' }),
    newestValue({ source: 'orchestrator.resource.type' }),
    newestValue({ source: 'orchestrator.type' }),

    ...getCommonFieldDescriptions('entity'),
  ],
} as const satisfies EntityDefinitionWithoutId;
