/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { HuntCoordinatorResult } from '@kbn/alertzero-common';

/**
 * Envelope on the hidden `security.hunt_coordinator_result` attachment.
 * Uses `state` (not `status`) because `HuntCoordinatorResult.status` already exists.
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

export type HuntCoordinatorResultTerminalAttachment = Extract<
  HuntCoordinatorResultAttachment,
  { state: 'completed' | 'failed' }
>;
