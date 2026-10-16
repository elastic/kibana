/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { HuntCoordinatorResult } from '@kbn/alertzero-common';

/**
 * Lifecycle of one hunt coordinator run as the hunt child observes it through the hidden
 * result attachment: the POST creates it `running`, the detached pipeline moves it to
 * `completed` (carrying the full result) or `failed` (carrying a safe message).
 */
export const HUNT_COORDINATOR_RESULT_STATES = ['running', 'completed', 'failed'] as const;
export type HuntCoordinatorResultState = (typeof HUNT_COORDINATOR_RESULT_STATES)[number];

/**
 * Envelope stored on the hidden `security.hunt_coordinator_result` attachment. The field is
 * `state`, not `status`, because the coordinator result it wraps already has a `status`
 * (`blocked`, `tier1_only`, ...) and the hunt child reads both.
 *
 * Strict at every level: the hunt child reads `data.state`, `data.result.*` and
 * `data.error.message` by path, so a stray key is a writer bug, not a display field to keep.
 * `error.message` is a fixed, analyst-safe string; the real error stays in the server log.
 */
export const huntCoordinatorResultAttachmentSchema = lazySchema(() => {
  const envelopeBase = {
    run_id: z.string().min(1).max(128),
    report_id: z.string().min(1).max(512).optional(),
  };
  return z.discriminatedUnion('state', [
    z.strictObject({ ...envelopeBase, state: z.literal('running') }),
    z.strictObject({
      ...envelopeBase,
      state: z.literal('completed'),
      result: HuntCoordinatorResult,
    }),
    z.strictObject({
      ...envelopeBase,
      state: z.literal('failed'),
      error: z.strictObject({ message: z.string().min(1).max(1024) }),
    }),
  ]);
});

export type HuntCoordinatorResultAttachment = z.infer<typeof huntCoordinatorResultAttachmentSchema>;
