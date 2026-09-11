/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const MAX_ALERTS_PER_TRIGGER = 10_000;
export const MAX_ID_LENGTH = 512;
export const MAX_TAG_LENGTH = 256;
export const MAX_ASSIGNEE_UID_LENGTH = 256;
export const MAX_USERNAME_LENGTH = 256;
export const MAX_TAGS_PER_OPERATION = 100;
export const MAX_ASSIGNEES_PER_OPERATION = 100;

export const workflowStatusEnum = z.enum(['open', 'acknowledged', 'in-progress', 'closed']);

export type WorkflowStatus = z.infer<typeof workflowStatusEnum>;
export const WORKFLOW_STATUS_VALUES = workflowStatusEnum.options;

export const previousStatusSchema = z.object({
  id: z.string().min(1).max(MAX_ID_LENGTH),
  previousStatus: workflowStatusEnum,
});
