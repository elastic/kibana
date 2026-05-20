/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnifiedAttachmentTypeSetup } from '@kbn/cases-plugin/server';
import { INDICATOR_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { IndicatorAttachmentPayloadSchema } from '../../../common/cases/attachments/indicator';

/**
 * Server-side indicator attachment type registration.
 * Uses a zod schema (via `defineAttachment` on the client) to validate the full payload.
 */
export const getIndicatorAttachmentType = (): UnifiedAttachmentTypeSetup => ({
  id: INDICATOR_ATTACHMENT_TYPE,
  schema: IndicatorAttachmentPayloadSchema,
});
