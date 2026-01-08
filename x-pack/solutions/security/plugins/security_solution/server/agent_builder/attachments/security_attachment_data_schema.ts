/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Base schema for all Security Solution agent-builder attachments.
 *
 * Each attachment can override its UI label by providing an `attachmentLabel`.
 */
export const securityAttachmentDataSchema = z.object({
  attachmentLabel: z.string(),
});

export type SecurityAttachmentData = z.infer<typeof securityAttachmentDataSchema>;

