/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { truncationSchema } from '../../../common/truncation';
import {
  boundedStringSchema,
  countSchema,
  fleetAgentComponentSchema,
  fleetAgentComponentUnitSchema,
  fleetAgentSchema,
  getEndpointInventoryCountsOutputSchema,
  hostPolicyActionSchema,
  hostPolicyResponseAppliedSchema,
  hostPolicyResponseSchema,
  hostRecordSchema,
} from '../../hosts';
import { getEndpointPackageStatusOutputSchema } from '../../package';
import { AT_CAVEATS_MAX, healthReasonValues } from './diagnosis_enums';

export const AT_COMPONENTS_MAX = 10;
export const AT_UNITS_MAX = 5;
export const AT_MESSAGE_MAX_CHARS = 200;
export const AT_ACTIONS_MAX = 10;
export const AT_CANDIDATES_MAX = 10;

const atMessageSchema = lazySchema(() => z.string().max(AT_MESSAGE_MAX_CHARS));

export const atHealthSchema = lazySchema(() =>
  z.object({
    state: boundedStringSchema,
    reasons: z.array(boundedStringSchema).max(healthReasonValues.length),
  })
);

export const atHostPolicyActionSchema = lazySchema(() =>
  hostPolicyActionSchema.extend({
    message: atMessageSchema,
  })
);

export const atHostPolicyResponseSchema = lazySchema(() =>
  hostPolicyResponseSchema.extend({
    Endpoint: z.object({
      policy: z.object({
        applied: hostPolicyResponseAppliedSchema.extend({
          actions: z.array(atHostPolicyActionSchema).max(AT_ACTIONS_MAX),
        }),
      }),
    }),
  })
);

export const atFleetAgentComponentUnitSchema = lazySchema(() =>
  fleetAgentComponentUnitSchema.extend({
    message: atMessageSchema,
  })
);

export const atFleetAgentComponentSchema = lazySchema(() =>
  fleetAgentComponentSchema.extend({
    message: atMessageSchema,
    units: z.array(atFleetAgentComponentUnitSchema).max(AT_UNITS_MAX),
  })
);

export const atFleetAgentSchema = lazySchema(() =>
  fleetAgentSchema.extend({
    components: z.array(atFleetAgentComponentSchema).max(AT_COMPONENTS_MAX),
  })
);

export const troubleshootingDiagnosisPackageStatusSchema = lazySchema(() =>
  getEndpointPackageStatusOutputSchema.pick({
    package: true,
    stale: true,
    configurations: true,
  })
);

export const troubleshootingDiagnosisInventoryCountsSchema = lazySchema(() =>
  getEndpointInventoryCountsOutputSchema.pick({
    fleet_agent_count: true,
    united_metadata_count: true,
    current_metadata_count: true,
  })
);

export const troubleshootingDiagnosisOmittedSchema = lazySchema(() =>
  z.object({
    components: countSchema,
    units: countSchema,
    actions: countSchema,
  })
);

export const troubleshootingDiagnosisSchema = lazySchema(() =>
  z.object({
    target: hostRecordSchema.nullable(),
    candidates: z.array(hostRecordSchema).max(AT_CANDIDATES_MAX),
    truncation: truncationSchema.optional(),
    agent: atFleetAgentSchema.nullable().optional(),
    policy_response: atHostPolicyResponseSchema.nullable().optional(),
    health: atHealthSchema.optional(),
    package_status: troubleshootingDiagnosisPackageStatusSchema,
    inventory_counts: troubleshootingDiagnosisInventoryCountsSchema.optional(),
    omitted: troubleshootingDiagnosisOmittedSchema.optional(),
    caveats: z.array(boundedStringSchema).max(AT_CAVEATS_MAX),
  })
);
export type TroubleshootingDiagnosis = z.infer<typeof troubleshootingDiagnosisSchema>;
