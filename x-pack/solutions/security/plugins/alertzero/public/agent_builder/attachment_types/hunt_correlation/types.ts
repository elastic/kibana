/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { huntCorrelationAttachmentDataSchema } from '../../../../common/hunt_correlation_attachment_schema';
import type { HuntCorrelationAttachmentData } from '../../../../common/hunt_correlation_attachment_schema';

export type { HuntCorrelationAttachmentData };
export type HuntCorrelationAttachment = Attachment<string, HuntCorrelationAttachmentData>;
export type Anchor = HuntCorrelationAttachmentData['anchors'][number];
export type DiamondScore = HuntCorrelationAttachmentData['diamond_scores'][number];

/** Validates a raw attachment payload against the shared zod schema. */
export const parseHuntCorrelationData = (
  candidate: unknown
): HuntCorrelationAttachmentData | undefined => {
  const result = huntCorrelationAttachmentDataSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
};
