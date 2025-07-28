/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newestValue } from './field_utils';
import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions } from './common';

export const GENERIC_DEFINITION_VERSION = '1.0.0';
export const GENERIC_IDENTITY_FIELD = 'entity.id';
export const genericEntityEngineDescription: EntityDescription = {
  entityType: 'generic',
  version: GENERIC_DEFINITION_VERSION,
  identityField: GENERIC_IDENTITY_FIELD,
  identityFieldMapping: { type: 'keyword' },
  settings: {
    timestampField: '@timestamp',
  },
  fields: [
    newestValue({ source: 'entity.name' }),
    newestValue({ source: 'entity.source' }),
    newestValue({ source: 'entity.type' }),
    newestValue({ source: 'entity.sub_type' }),
    newestValue({ source: 'entity.url' }),

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
    newestValue({ source: 'host.cpu.usage' }),
    newestValue({ source: 'host.disk.read.bytes' }),
    newestValue({ source: 'host.disk.write.bytes' }),
    newestValue({ source: 'host.domain' }),
    newestValue({ source: 'host.hostname' }),
    newestValue({ source: 'host.id' }),
    newestValue({ source: 'host.mac' }),
    newestValue({ source: 'host.name' }),
    newestValue({ source: 'host.network.egress.bytes' }),
    newestValue({ source: 'host.network.egress.packets' }),
    newestValue({ source: 'host.network.ingress.bytes' }),
    newestValue({ source: 'host.network.ingress.packets' }),
    newestValue({ source: 'host.pid_ns_ino' }),
    newestValue({ source: 'host.type' }),
    newestValue({ source: 'host.uptime' }),
    newestValue({
      source: 'host.ip',
      mapping: {
        type: 'ip',
      },
    }),

    newestValue({ source: 'user.domain' }),
    newestValue({ source: 'user.email' }),
    newestValue({ source: 'user.full_name' }),
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
};
