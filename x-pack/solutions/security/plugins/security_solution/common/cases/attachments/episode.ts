/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SECURITY_EPISODE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

/**
 * Enough episode fields to render the case comment + the Episodes attachment table without
 * re-fetching (the episode is an ES|QL projection with no stable doc to resolve against).
 */
const EpisodeAttachmentMetadataSchema = z
  .object({
    title: z.string(),
    ruleId: z.string(),
    status: z.string(),
    severity: z.string().nullable().optional(),
    triggeredAt: z.string().nullable().optional(),
  })
  .strict();

export const EpisodeAttachmentPayloadSchema = z
  .object({
    type: z.literal(SECURITY_EPISODE_ATTACHMENT_TYPE),
    owner: z.string(),
    // The `episode.id` — a reference id, not a queryable ES doc.
    attachmentId: z.string().min(1),
    metadata: EpisodeAttachmentMetadataSchema,
  })
  .strict();

export type EpisodeAttachmentPayload = z.infer<typeof EpisodeAttachmentPayloadSchema>;
export type EpisodeAttachmentMetadata = z.infer<typeof EpisodeAttachmentMetadataSchema>;
