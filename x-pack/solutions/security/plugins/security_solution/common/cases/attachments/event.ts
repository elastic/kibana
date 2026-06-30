/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SECURITY_EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

/**
 * Metadata shape for `security.event` attachments. Only `index` is meaningful
 * today; legacy event attachments could carry it as a scalar or an array.
 *
 * Named `SecurityEventAttachmentMetadataSchema` to disambiguate from the
 * legacy non-unified `EventAttachmentPayload` defined in
 * `@kbn/cases-plugin/common/types/domain_zod/attachment/v1`.
 */
export const SecurityEventAttachmentMetadataSchema = z
  .object({
    index: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .strict();

export type SecurityEventAttachmentMetadata = z.infer<typeof SecurityEventAttachmentMetadataSchema>;

/**
 * Full unified-payload schema for `security.event`. Registered on the unified
 * registry via `schema:` so the cases plugin validates the entire payload (not
 * just the metadata slice). `metadata` is optional (rather than nullable) so
 * the inferred renderer type stays `Metadata | undefined`.
 */
export const SecurityEventAttachmentPayloadSchema = z
  .object({
    type: z.literal(SECURITY_EVENT_ATTACHMENT_TYPE),
    owner: z.string(),
    attachmentId: z.union([z.string(), z.array(z.string())]),
    metadata: SecurityEventAttachmentMetadataSchema.optional(),
  })
  .strict();

export type SecurityEventAttachmentPayload = z.infer<typeof SecurityEventAttachmentPayloadSchema>;
