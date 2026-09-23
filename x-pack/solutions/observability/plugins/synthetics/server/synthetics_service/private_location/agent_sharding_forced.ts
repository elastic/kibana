/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';
import { AGENT_SHARDING_MIN_LICENSE } from '../../../common/constants/license';
import type { SyntheticsServerSetup } from '../../types';

export const hasAgentShardingLicense = (
  license?: Pick<ILicense, 'hasAtLeast' | 'isAvailable' | 'isActive'>
): boolean =>
  Boolean(
    license?.isAvailable && license.isActive && license.hasAtLeast(AGENT_SHARDING_MIN_LICENSE)
  );

/**
 * On Elastic Cloud and Serverless with an Enterprise license every private
 * location is scalable, regardless of the stored per-location `isAgentSharding`.
 */
export const isAgentShardingForced = async (
  server: Pick<SyntheticsServerSetup, 'cloud' | 'pluginsStart' | 'logger'>
): Promise<boolean> => {
  const { cloud, pluginsStart, logger } = server;
  if (!cloud?.isCloudEnabled && !cloud?.isServerlessEnabled) {
    return false;
  }
  try {
    return hasAgentShardingLicense(await pluginsStart.licensing.getLicense());
  } catch (e) {
    logger.error(e);
    return false;
  }
};

export const applyForcedAgentSharding = <T extends { isAgentSharding?: boolean }>(
  locations: T[],
  isForced: boolean
): T[] =>
  isForced ? locations.map((location) => ({ ...location, isAgentSharding: true })) : locations;
