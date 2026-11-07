/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const id = z.string().min(1).max(256);
const email = z.string().max(320).email();
const date = z
  .string()
  .max(40)
  .refine((value) => Number.isFinite(Date.parse(value)));
const hash = z
  .string()
  .max(64)
  .regex(/^[a-f0-9]{64}$/);

export const googleAdkContextSchema = z
  .object({
    project_id: id,
    service_name: id,
    revision: id,
    run_id: id,
    trace_id: z
      .string()
      .max(32)
      .regex(/^[a-f0-9]{32}$/),
    span_id: z
      .string()
      .max(16)
      .regex(/^[a-f0-9]{16}$/),
    invocation_id: id.optional(),
    requester: z
      .object({
        email,
        subject: id,
        authenticated: z.literal(true),
        principal_type: z.enum(['google_account', 'service_account']).optional(),
        provenance: z.literal('google_signed_id_token_verified_by_application'),
        human_identity: z.literal('account_level_only'),
      })
      .strict(),
    runtime: z
      .object({
        email,
        provenance: z.literal('cloud_run_metadata_service_identity'),
      })
      .strict(),
    owner: z
      .object({
        email,
        recorded_by: email,
        effective_from: date,
        effective_to: date.optional(),
        provenance: z.literal('operator_declared'),
      })
      .strict()
      .optional(),
    resources: z
      .array(
        z
          .object({
            uri: z.string().min(1).max(2048),
            generation: z
              .string()
              .max(30)
              .regex(/^[0-9]+$/),
            sha256: hash,
            tool_call_id: id,
            content_verified: z.boolean(),
            editor: z
              .object({
                email,
                audit_id: id,
                timestamp: date,
                change_id: id,
                provenance: z.literal('cloud_audit_write_receipt_generation_hash'),
              })
              .strict()
              .optional(),
          })
          .strict()
      )
      .max(20),
    audit_matches: z
      .array(
        z
          .object({
            tool_call_id: id,
            audit_id: id,
            principal: email,
            method: id,
            timestamp: date,
          })
          .strict()
      )
      .max(80),
    source_policy: z
      .object({
        id,
        name: z.string().min(1).max(256),
        revision: z.number().int().min(1).max(1_000_000),
        mode: z.literal('monitor'),
        enforced: z.literal(false),
        matches: z
          .array(
            z
              .object({
                tool_call_id: id,
                rule_id: id,
                title: z.string().min(1).max(512),
                severity: z.enum(['low', 'medium', 'high', 'critical']),
                reason: z.string().min(1).max(2048),
              })
              .strict()
          )
          .max(80),
      })
      .strict(),
  })
  .strict();

export type GoogleAdkContext = z.infer<typeof googleAdkContextSchema>;
