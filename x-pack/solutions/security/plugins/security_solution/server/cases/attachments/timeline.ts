/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedAttachmentTypeSetup } from '@kbn/cases-plugin/server';
import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { TimelineAttachmentPayloadSchema } from '../../../common/cases/attachments/timeline';

/**
 * Server-side timeline attachment type registration.
 * Validates the full payload (type, owner, attachmentId, metadata.title) via zod.
 */
export const getTimelineAttachmentType = (): UnifiedAttachmentTypeSetup => ({
  id: SECURITY_TIMELINE_ATTACHMENT_TYPE,
  schema: TimelineAttachmentPayloadSchema,
});
