/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { entityMaintainersRegistry } from '../../../../tasks/entity_maintainers/entity_maintainers_registry';

function validateMaintainerIdExists(data: { id: string }, ctx: z.RefinementCtx): void {
  if (!entityMaintainersRegistry.hasId(data.id)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['id'],
      message: 'Entity maintainer not found',
    });
  }
}

export const maintainerIdParamsSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
  })
  .superRefine(validateMaintainerIdExists);
