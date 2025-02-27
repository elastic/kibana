/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING } from '@kbn/management-settings-ids';
import type { Logger } from '@kbn/core/server';
import type { SecuritySolutionRequestHandlerContext } from '../../types';

export async function checkAssetInventoryEnabled(
  context: SecuritySolutionRequestHandlerContext,
  logger: Logger
) {
  const core = await context.core;
  const isAssetInventoryEnabled = await core.uiSettings.client.get<boolean>(
    SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING
  );

  logger.debug(`isAssetInventoryEnabled: ${isAssetInventoryEnabled}`);

  return isAssetInventoryEnabled;
}
