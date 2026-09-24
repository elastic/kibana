/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicense } from '@kbn/licensing-types';
import { AGENT_SHARDING_MIN_LICENSE } from '../../../common/constants/license';
import type { SyntheticsServerSetup } from '../../types';
import { getRebalancePrivateLocationShardsEnabled } from '../../tasks/rebalance_shards_enabled';

export const hasAgentShardingLicense = (
  license?: Pick<ILicense, 'hasAtLeast' | 'isAvailable' | 'isActive'>
): boolean =>
  Boolean(
    license?.isAvailable && license.isActive && license.hasAtLeast(AGENT_SHARDING_MIN_LICENSE)
  );

/** With an Enterprise license every private location shards monitors across its agents. */
export const isAgentShardingLicensed = async (
  server: Pick<SyntheticsServerSetup, 'pluginsStart' | 'logger'>
): Promise<boolean> => {
  try {
    return hasAgentShardingLicense(await server.pluginsStart.licensing.getLicense());
  } catch (e) {
    server.logger.error(e);
    return false;
  }
};

/**
 * Cluster-wide kill-switch stored on the rebalance Task Manager task.
 * Defaults to on so a task-read failure does not change CRUD behavior.
 */
const isShardRebalanceEnabled = async (
  server: Pick<SyntheticsServerSetup, 'pluginsStart' | 'logger'>
): Promise<boolean> => {
  try {
    return await getRebalancePrivateLocationShardsEnabled(server.pluginsStart.taskManager);
  } catch (e) {
    server.logger.error(e);
    return true;
  }
};

/** Monitors are pinned to one agent only with an Enterprise license and rebalancing on. */
export const isAgentShardingActive = async (
  server: Pick<SyntheticsServerSetup, 'pluginsStart' | 'logger'>
): Promise<boolean> => {
  const [isLicensed, isRebalanceEnabled] = await Promise.all([
    isAgentShardingLicensed(server),
    isShardRebalanceEnabled(server),
  ]);
  return isLicensed && isRebalanceEnabled;
};
