/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ProtectionModes } from '../../../../endpoint/types';
import {
  POLICY_COUPLING_PROTECTIONS,
  type PolicyCouplingProtection,
} from '../../../../endpoint/models/policy_config_helpers';
import { policyIdentifierInputSchema, policyPathInputSchema } from './input_schemas';

const POLICY_CHANGES_MAX = 50;

export const POLICY_CHANGE_PROTECTIONS = POLICY_COUPLING_PROTECTIONS;

export type PolicyChangeProtection = PolicyCouplingProtection;

export const policyChangeOperationSchema = lazySchema(() =>
  z.discriminatedUnion('op', [
    z
      .object({
        op: z.literal('set_protection_enabled'),
        protection: z.enum(POLICY_CHANGE_PROTECTIONS),
        enabled: z.boolean(),
      })
      .strict(),
    z
      .object({
        op: z.literal('set_protection_level'),
        protection: z.enum(POLICY_CHANGE_PROTECTIONS),
        mode: z.enum([ProtectionModes.detect, ProtectionModes.prevent]),
      })
      .strict()
      .describe(
        'Represents the product protection-level control for a protection area. It carries the protection-card OS coupling and popup synchronization that the product applies for that control.'
      ),
    z
      .object({
        op: z.literal('set_field'),
        path: policyPathInputSchema,
        value: z.unknown(),
      })
      .strict()
      .describe(
        'Names one directly requested policy path. Canonical dependent changes may be applied and reported as coupled effects. Protection-card mode-and-popup semantics belong to set_protection_level. Use set_field for explicit path intent.'
      ),
  ])
);

export const assessPolicyChangeParamsSchema = lazySchema(() =>
  z
    .object({
      idOrName: policyIdentifierInputSchema,
      changes: z.array(policyChangeOperationSchema).min(1).max(POLICY_CHANGES_MAX),
    })
    .strict()
);

export type PolicyChangeOperation = z.infer<typeof policyChangeOperationSchema>;
export type AssessPolicyChangeParams = z.infer<typeof assessPolicyChangeParamsSchema>;
