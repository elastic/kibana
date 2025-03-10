/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { CSP_FLEET_PACKAGE_KUERY } from '../../common/utils/helpers';

export const isCspPackagePolicyInstalled = async (
  packagePolicyClient: PackagePolicyClient,
  soClient: SavedObjectsClientContract,
  logger: Logger
): Promise<boolean> => {
  try {
    const { total } = await packagePolicyClient.list(soClient, {
      kuery: CSP_FLEET_PACKAGE_KUERY,
      page: 1,
    });

    return total > 0;
  } catch (e) {
    logger.error(e);
    return false;
  }
};
