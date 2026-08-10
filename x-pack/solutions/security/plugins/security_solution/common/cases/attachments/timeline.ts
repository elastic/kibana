/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

const TimelineAttachmentMetadataSchema = z
  .object({
    title: z.string(),
  })
  .strict();

export const TimelineAttachmentPayloadSchema = z
  .object({
    type: z.literal(SECURITY_TIMELINE_ATTACHMENT_TYPE),
    owner: z.string(),
    attachmentId: z.string().min(1),
    metadata: TimelineAttachmentMetadataSchema,
  })
  .strict();

export type TimelineAttachmentPayload = z.infer<typeof TimelineAttachmentPayloadSchema>;
export type TimelineAttachmentMetadata = z.infer<typeof TimelineAttachmentMetadataSchema>;
