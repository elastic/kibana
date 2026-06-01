/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { INDICATOR_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

const IndicatorAttachmentMetadataSchema = z
  .object({
    indicatorName: z.string(),
    indicatorType: z.string(),
    indicatorFeedName: z.string(),
  })
  .strict();

export const IndicatorAttachmentPayloadSchema = z
  .object({
    type: z.literal(INDICATOR_ATTACHMENT_TYPE),
    owner: z.string(),
    attachmentId: z.string(),
    metadata: IndicatorAttachmentMetadataSchema,
  })
  .strict();

export type IndicatorAttachmentPayload = z.infer<typeof IndicatorAttachmentPayloadSchema>;
export type IndicatorAttachmentMetadata = z.infer<typeof IndicatorAttachmentMetadataSchema>;
