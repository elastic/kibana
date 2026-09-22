/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { alertZeroAttachmentDataSchema } from './attachment_data_schema';

/**
 * By-reference trigger carrier: the payload names a threat report by id, plus captured
 * display fallbacks. The live document itself is resolved client-side, space-projected,
 * by the `security.threat` renderer; the server only validates and formats the
 * reference and its fallback fields.
 */
export const threatAttachmentDataSchema = alertZeroAttachmentDataSchema.extend({
  report_id: z.string().min(1).max(512),
  title: z.string().min(1).max(512).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  source: z.string().min(1).max(256).optional(),
});

export type ThreatAttachmentData = z.infer<typeof threatAttachmentDataSchema>;
