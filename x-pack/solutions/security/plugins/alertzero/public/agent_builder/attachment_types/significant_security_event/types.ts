/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { significantSecurityEventAttachmentDataSchema } from '../../../../common/significant_security_event_schema';
import type { SignificantSecurityEventAttachmentData } from '../../../../common/significant_security_event_schema';

export type { SignificantSecurityEventAttachmentData } from '../../../../common/significant_security_event_schema';

export type SignificantSecurityEventAttachment = Attachment<
  string,
  SignificantSecurityEventAttachmentData
>;

/** Convenience view-model aliases for the renderer, all inferred from the zod schema. */
export type SecurityKnowledgeIndicator =
  SignificantSecurityEventAttachmentData['security_knowledge_indicators'][number];
export type TimelineEntry = SignificantSecurityEventAttachmentData['timeline'][number];
export type SignificantSecurityEventRef = NonNullable<
  SignificantSecurityEventAttachmentData['events']
>[number];
export type SignificantSecurityAlertRef = NonNullable<
  SignificantSecurityEventAttachmentData['alerts']
>[number];
export type HuntResult = NonNullable<SignificantSecurityEventAttachmentData['hunt_result']>;

/**
 * Validates the raw attachment payload against the zod schema. The server already
 * validates on write with the identical schema, so a payload that fails here is one
 * the server would have rejected; the renderer falls back to its empty state.
 */
export const parseSignificantSecurityEventData = (
  candidate: unknown
): SignificantSecurityEventAttachmentData | undefined => {
  const result = significantSecurityEventAttachmentDataSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
};
