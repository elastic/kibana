/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * AlertZero's equivalent of security_solution's `securityAttachmentDataSchema`: every
 * Hunt Watch attachment type accepts an optional `attachmentLabel` that survives validation
 * and drives `getLabel` overrides on the client.
 */
export const alertZeroAttachmentDataSchema = z.object({
  attachmentLabel: z.string().max(256).optional(),
});
