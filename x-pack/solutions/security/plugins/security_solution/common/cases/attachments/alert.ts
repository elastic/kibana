/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Single source of truth for the Security alert attachment metadata shape.
 * Used by the registry validator on both server and client.
 *
 * The unified-reference dispatcher passes `attachment.metadata` to this
 * validator (not the full payload), so we only validate the metadata bag
 * here. A follow-up will unify the dispatcher contract across reference and
 * value attachments and let validators inspect the entire payload.
 *
 * All fields are optional to remain compatible with legacy/in-flight metadata,
 * but when present they must conform to the expected types.
 */
export const SecurityAlertAttachmentMetadata = z.object({
  index: z.union([z.string(), z.array(z.string())]).optional(),
  rule: z
    .union([
      z.null(),
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
      }),
    ])
    .optional(),
});

export type SecurityAlertAttachmentMetadata = z.infer<typeof SecurityAlertAttachmentMetadata>;

/**
 * Decodes and validates Security alert attachment metadata.
 * Throws `ZodError` on failure; callers can surface this as `badRequest` at
 * the boundary if desired.
 */
export const decodeSecurityAlert = (metadata: unknown): SecurityAlertAttachmentMetadata =>
  SecurityAlertAttachmentMetadata.parse(metadata ?? {});
