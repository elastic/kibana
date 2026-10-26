/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const MAX_ALERTS_PER_TRIGGER = 10_000;
export const MAX_ID_LENGTH = 512;
export const MAX_TAG_LENGTH = 256;
export const MAX_ASSIGNEE_UID_LENGTH = 256;
export const MAX_USERNAME_LENGTH = 256;
export const MAX_TAGS_PER_OPERATION = 100;
export const MAX_ASSIGNEES_PER_OPERATION = 100;

export const WORKFLOW_STATUS_VALUES = ['open', 'acknowledged', 'in-progress', 'closed'] as const;

export const workflowStatusEnum = lazySchema(() => z.enum(WORKFLOW_STATUS_VALUES));

export type WorkflowStatus = z.infer<typeof workflowStatusEnum>;

export const previousStatusSchema = lazySchema(() =>
  z.object({
    id: z.string().min(1).max(MAX_ID_LENGTH),
    previousStatus: workflowStatusEnum,
  })
);
