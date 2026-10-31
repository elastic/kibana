/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UnhealthyReason } from '@kbn/fleet-plugin/common/types';
import { EXCERPT_MAX_CHARS, MAX_INPUT_STRING_CHARS } from '../../common/budget';

export const MAX_HOST_TARGETS = 10;
export const MAX_HOST_RECORDS = 10;
export const MAX_HOST_IPS = 5;
export const MAX_DIAGNOSTIC_COMPONENTS = 10;
export const MAX_DIAGNOSTIC_UNITS = 10;
export const MAX_POLICY_ACTIONS = 20;

export const ELASTIC_DEFEND_COMPONENT_TYPE = 'endpoint';

export const MAX_AGENT_ID_LENGTH = 64;

export const endpointPartValues = [
  'host_state',
  'host_enrollments',
  'agent_components',
  'policy_response',
  'package_freshness',
  'package_configurations',
  'package_default_settings',
  'fleet_agent_count',
  'united_metadata_count',
  'current_metadata_count',
] as const;
export type EndpointPart = (typeof endpointPartValues)[number];

export const resolvePartValues = ['host_state', 'host_enrollments'] as const;
export const diagnosticsPartValues = ['agent_components', 'policy_response'] as const;
export const packagePartValues = [
  'package_freshness',
  'package_configurations',
  'package_default_settings',
] as const;
export const inventoryPartValues = [
  'fleet_agent_count',
  'united_metadata_count',
  'current_metadata_count',
] as const;

export const isElasticDefendComponent = (component: { type: string }): boolean =>
  component.type === ELASTIC_DEFEND_COMPONENT_TYPE;

export const countSchema = lazySchema(() => z.number().int().nonnegative());
export const boundedStringSchema = lazySchema(() => z.string().max(MAX_INPUT_STRING_CHARS));
export const messageSchema = lazySchema(() => z.string().max(EXCERPT_MAX_CHARS));
export const idSchema = lazySchema(() => z.string().max(MAX_AGENT_ID_LENGTH));
export const endpointPartSchema = boundedStringSchema;

export const hostTargetSchema = lazySchema(() =>
  z
    .object({
      hostname: z.string().max(MAX_INPUT_STRING_CHARS).optional(),
      agent_id: idSchema.optional(),
    })
    .refine((value) => value.hostname !== undefined || value.agent_id !== undefined, {
      message: 'Each target needs a hostname or an agent_id',
    })
);

export const policyInfoEntrySchema = lazySchema(() =>
  z.object({
    id: boundedStringSchema,
    revision: z.number(),
  })
);

export const hostRecordPolicyInfoSchema = lazySchema(() =>
  z.object({
    agent: z.object({
      configured: policyInfoEntrySchema,
      applied: policyInfoEntrySchema,
    }),
    endpoint: policyInfoEntrySchema,
  })
);

export const hostRecordOsSchema = lazySchema(() =>
  z.object({
    name: boundedStringSchema,
    version: boundedStringSchema,
    platform: boundedStringSchema,
    family: boundedStringSchema,
  })
);

export const hostRecordMetadataSchema = lazySchema(() =>
  z.object({
    agent: z.object({
      id: boundedStringSchema,
      version: boundedStringSchema,
      type: boundedStringSchema,
    }),
    elastic: z.object({
      agent: z.object({ id: boundedStringSchema }),
    }),
    host: z.object({
      hostname: boundedStringSchema,
      name: boundedStringSchema,
      ip: z.array(boundedStringSchema).max(MAX_HOST_IPS),
      ip_total: countSchema.optional(),
      architecture: boundedStringSchema,
      os: hostRecordOsSchema,
    }),
    Endpoint: z.object({
      status: boundedStringSchema,
      policy: z.object({
        applied: z.object({
          id: boundedStringSchema,
          name: boundedStringSchema,
          status: boundedStringSchema,
          endpoint_policy_version: z.number(),
          version: z.number(),
        }),
      }),
      state: z.object({ isolation: z.boolean().optional() }).optional(),
    }),
  })
);

export const hostRecordFleetAgentSchema = lazySchema(() =>
  z.object({
    id: boundedStringSchema,
    status: boundedStringSchema.optional(),
    active: z.boolean(),
    enrolled_at: boundedStringSchema,
    unenrolled_at: boundedStringSchema.optional(),
    last_checkin: boundedStringSchema.optional(),
    policy_id: boundedStringSchema.optional(),
    policy_revision: z.number().nullable().optional(),
    agent: z.object({ version: boundedStringSchema }).optional(),
    local_metadata: z.object({
      host: z.object({
        hostname: boundedStringSchema,
        name: boundedStringSchema,
      }),
      os: z.object({
        name: boundedStringSchema,
        version: boundedStringSchema,
        platform: boundedStringSchema,
      }),
    }),
  })
);

export const hostRecordSchema = lazySchema(() =>
  z.object({
    agent_id: idSchema,
    endpoint_id: idSchema.optional(),
    host_status: boundedStringSchema,
    last_checkin: boundedStringSchema.optional(),
    metadata: hostRecordMetadataSchema.optional(),
    policy_info: hostRecordPolicyInfoSchema.optional(),
    fleet_agent: hostRecordFleetAgentSchema.optional(),
  })
);

export const fleetAgentComponentUnitSchema = lazySchema(() =>
  z.object({
    id: boundedStringSchema,
    type: boundedStringSchema,
    status: boundedStringSchema,
    message: messageSchema,
  })
);

export const fleetAgentComponentSchema = lazySchema(() =>
  z.object({
    id: boundedStringSchema,
    type: boundedStringSchema,
    status: boundedStringSchema,
    message: messageSchema,
    units: z.array(fleetAgentComponentUnitSchema).max(MAX_DIAGNOSTIC_UNITS),
    units_total: countSchema.optional(),
  })
);

export const fleetAgentSchema = lazySchema(() =>
  z.object({
    id: boundedStringSchema,
    status: boundedStringSchema.optional(),
    last_checkin: boundedStringSchema.optional(),
    last_checkin_status: boundedStringSchema.optional(),
    last_checkin_message: messageSchema.optional(),
    unhealthy_reason: z
      .array(boundedStringSchema)
      .max(Object.values(UnhealthyReason).length)
      .optional(),
    components: z.array(fleetAgentComponentSchema).max(MAX_DIAGNOSTIC_COMPONENTS),
    components_total: countSchema.optional(),
  })
);

export const hostPolicyActionSchema = lazySchema(() =>
  z.object({
    name: boundedStringSchema,
    status: boundedStringSchema,
    message: messageSchema,
  })
);

export const hostPolicyResponseAppliedSchema = lazySchema(() =>
  z.object({
    id: boundedStringSchema,
    name: boundedStringSchema,
    status: boundedStringSchema,
    version: z.number(),
    endpoint_policy_version: z.number(),
    actions: z.array(hostPolicyActionSchema).max(MAX_POLICY_ACTIONS),
    actions_total: countSchema.optional(),
  })
);

export const hostPolicyResponseSchema = lazySchema(() =>
  z.object({
    '@timestamp': boundedStringSchema.optional(),
    agent: z.object({ id: boundedStringSchema, version: boundedStringSchema }),
    Endpoint: z.object({
      policy: z.object({ applied: hostPolicyResponseAppliedSchema }),
    }),
  })
);
