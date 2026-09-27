/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedAttachmentTypeSetup } from '@kbn/cases-plugin/server';
import { SECURITY_EPISODE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EpisodeAttachmentPayloadSchema } from '../../../common/cases/attachments/episode';

/**
 * Server-side v2 alert-episode attachment registration. Validates the payload (type, owner,
 * attachmentId, metadata) via zod. A value/reference attachment with no alerts-index lookup.
 */
export const getEpisodeAttachmentType = (): UnifiedAttachmentTypeSetup => ({
  id: SECURITY_EPISODE_ATTACHMENT_TYPE,
  schema: EpisodeAttachmentPayloadSchema,
});
