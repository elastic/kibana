/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { entityMaintainersRegistry } from '../../../../tasks/entity_maintainers/entity_maintainers_registry';
import { ENTITY_STORE_STATUS } from '../../../../domain/constants';
import type { AssetManagerClient } from '../../../../domain/asset_manager';
import { getMissingPrivileges } from '../../utils/get_missing_privileges';

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

export const maintainerIdsQuerySchema = z.object({
  ids: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional(),
});

/**
 * Validates that a request can proceed with entity maintainer operations:
 * 1. User has required privileges (cluster, index, saved object).
 * 2. Entity store is installed (maintainer operations are only valid when entity store exists).
 * Returns an error response if validation fails, or null if validation passes.
 */
export async function validateMaintainersRequest(
  assetManagerClient: AssetManagerClient,
  req: KibanaRequest,
  res: KibanaResponseFactory
): Promise<IKibanaResponse | null> {
  const privileges = await assetManagerClient.getPrivileges(req);
  if (!privileges.hasAllRequested) {
    return res.forbidden({
      body: {
        attributes: getMissingPrivileges(privileges),
        message: `User '${privileges.username}' has insufficient privileges`,
      },
    });
  }

  const { status } = await assetManagerClient.getStatus();
  if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
    return res.badRequest({
      body: {
        message:
          'Entity store is not installed. Install the entity store first, then manage entity maintainers.',
      },
    });
  }

  return null;
}
