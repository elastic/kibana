/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
} from '../../endpoint/service/response_actions/constants';

/**
 * Common fields shared by every emulation command request.
 *
 * Keeping these on a single base object makes the discriminated union
 * below readable: each variant only spells out the parts that differ.
 */
const commonFields = {
  /** Unique identifier for the emulation run. */
  emulationId: z.string().min(1),
  /** EDR agent type — must be one of the supported types. */
  agentType: z.enum(RESPONSE_ACTION_AGENT_TYPE),
  /** Endpoint agent IDs the command applies to (1+). */
  endpointIds: z.array(z.string().min(1)).min(1),
} as const;

/** Optional human-readable comment recorded against the response action. */
const optionalCommentParams = z.object({ comment: z.string().optional() }).strict().optional();

/**
 * `kill-process` and `suspend-process` accept *either* a `pid` (number) or
 * an `entity_id` (string), never both. The downstream API encodes this as
 * a tagged union (`pid: number, entity_id?: never` vs.
 * `entity_id: string, pid?: never`) so we mirror that with a Zod union.
 *
 * A typo like `entityId` (camelCase) or supplying both fields used to slip
 * through the previous `z.record(z.string(), z.unknown())` schema and
 * silently turn into an undefined parameter at the underlying client.
 */
const processRefByPid = z
  .object({
    comment: z.string().optional(),
    pid: z.number().int().positive(),
  })
  .strict();

const processRefByEntityId = z
  .object({
    comment: z.string().optional(),
    entity_id: z.string().min(1),
  })
  .strict();

const processRefParams = z.union([processRefByPid, processRefByEntityId]);

/**
 * `memory-dump` accepts:
 * - `type: 'kernel'` — no `pid`/`entity_id`
 * - `type: 'process'` — exactly one of `pid` or `entity_id`
 *
 * We use `z.union` (not `z.discriminatedUnion`) here because the
 * `process` shape itself comes in two forms that share the same `type`
 * literal — Zod v4's discriminated union rejects duplicate discriminator
 * values, so we keep the structural union and let Zod try each variant.
 * The downstream API enforces the same constraints; we mirror them here
 * to fail fast at the schema layer.
 */
const memoryDumpKernelParams = z
  .object({ comment: z.string().optional(), type: z.literal('kernel') })
  .strict();

const memoryDumpProcessByPid = z
  .object({
    comment: z.string().optional(),
    type: z.literal('process'),
    pid: z.number().int().positive(),
  })
  .strict();

const memoryDumpProcessByEntityId = z
  .object({
    comment: z.string().optional(),
    type: z.literal('process'),
    entity_id: z.string().min(1),
  })
  .strict();

const memoryDumpParams = z.union([
  memoryDumpKernelParams,
  memoryDumpProcessByPid,
  memoryDumpProcessByEntityId,
]);

/** `cancel` cancels a previously-dispatched action by its `id`. */
const cancelParams = z
  .object({
    comment: z.string().optional(),
    id: z.string().min(1),
  })
  .strict();

/** `get-file` and `scan` both take a single absolute path on the host. */
const pathParams = z
  .object({
    comment: z.string().optional(),
    path: z.string().min(1),
  })
  .strict();

/** `execute` runs a shell command with an optional timeout. */
const executeParams = z
  .object({
    comment: z.string().optional(),
    command: z.string().min(1),
    timeout: z.number().int().positive().optional(),
  })
  .strict();

/**
 * `runscript` for the `endpoint` agent type runs a script-library entry by
 * `scriptId`. The cross-EDR shape is broader (CrowdStrike accepts `raw`,
 * Defender accepts `scriptName`, etc.) — but until the route resolves the
 * external connector client (today only `endpoint` is wired), the
 * endpoint shape is the only one we can validate strictly.
 */
const runscriptParams = z
  .object({
    comment: z.string().optional(),
    scriptId: z.string().min(1),
    scriptInput: z.string().optional(),
    timeout: z.number().int().positive().optional(),
  })
  .strict();

/**
 * `upload` is a multipart-style command — `file` is opaque to the
 * schema (the underlying client expects `Parameters<...>[0]['file']`).
 * The route does not currently support multipart bodies; until that's
 * wired the field is accepted as `unknown` so the runner cast still
 * compiles.
 */
const uploadParams = z
  .object({
    comment: z.string().optional(),
    file: z.unknown(),
    overwrite: z.boolean().optional(),
  })
  .strict();

/**
 * Discriminated union on `command`. Each variant declares the exact
 * shape of `parameters` that command needs — misspelled or extra keys
 * fail validation instead of silently turning into `undefined` inside
 * the runner's `as` casts.
 */
export const RunEmulationCommandInputSchema = z.discriminatedUnion('command', [
  z.object({ ...commonFields, command: z.literal('isolate'), parameters: optionalCommentParams }),
  z.object({ ...commonFields, command: z.literal('unisolate'), parameters: optionalCommentParams }),
  z.object({
    ...commonFields,
    command: z.literal('running-processes'),
    parameters: optionalCommentParams,
  }),
  z.object({ ...commonFields, command: z.literal('cancel'), parameters: cancelParams }),

  z.object({
    ...commonFields,
    command: z.literal('kill-process'),
    parameters: processRefParams,
  }),
  z.object({
    ...commonFields,
    command: z.literal('suspend-process'),
    parameters: processRefParams,
  }),
  z.object({
    ...commonFields,
    command: z.literal('memory-dump'),
    parameters: memoryDumpParams,
  }),

  z.object({ ...commonFields, command: z.literal('get-file'), parameters: pathParams }),
  z.object({ ...commonFields, command: z.literal('scan'), parameters: pathParams }),

  z.object({ ...commonFields, command: z.literal('execute'), parameters: executeParams }),
  z.object({ ...commonFields, command: z.literal('runscript'), parameters: runscriptParams }),

  z.object({ ...commonFields, command: z.literal('upload'), parameters: uploadParams }),
]);

export type RunEmulationCommandInput = z.infer<typeof RunEmulationCommandInputSchema>;

/**
 * Exposed for tests and consumers that need to know the canonical
 * command list without re-parsing the discriminated union.
 */
export const SUPPORTED_EMULATION_COMMANDS = RESPONSE_ACTION_API_COMMANDS_NAMES;
