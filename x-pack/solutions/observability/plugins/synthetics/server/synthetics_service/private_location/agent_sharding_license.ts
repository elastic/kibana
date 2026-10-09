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

/**
 * `unknown` means the license could not be read (e.g. ES briefly unreachable).
 * Callers must leave existing pins alone rather than treat it as a downgrade,
 * or a blip would unpin every monitor fleet-wide.
 */
export type AgentShardingLicenseStatus = 'licensed' | 'unlicensed' | 'unknown';

/** `active`: pin monitors; `inactive`: clear pins; `unknown`: keep pins as they are. */
export type AgentShardingMode = 'active' | 'inactive' | 'unknown';

type ShardingServer = Pick<SyntheticsServerSetup, 'pluginsStart' | 'logger'>;

export const toAgentShardingLicenseStatus = (
  license?: Pick<ILicense, 'hasAtLeast' | 'isAvailable' | 'isActive'>
): AgentShardingLicenseStatus => {
  if (!license?.isAvailable) {
    return 'unknown';
  }
  return license.isActive && license.hasAtLeast(AGENT_SHARDING_MIN_LICENSE)
    ? 'licensed'
    : 'unlicensed';
};

/** With an Enterprise license every private location shards monitors across its agents. */
export const getAgentShardingLicenseStatus = async (
  server: ShardingServer
): Promise<AgentShardingLicenseStatus> => {
  try {
    return toAgentShardingLicenseStatus(await server.pluginsStart.licensing.getLicense());
  } catch (e) {
    server.logger.error(e);
    return 'unknown';
  }
};

/**
 * Cluster-wide kill-switch stored on the rebalance Task Manager task.
 * Defaults to on so a task-read failure does not change CRUD behavior.
 */
const isShardRebalanceEnabled = async (server: ShardingServer): Promise<boolean> => {
  try {
    return await getRebalancePrivateLocationShardsEnabled(server.pluginsStart.taskManager);
  } catch (e) {
    server.logger.error(e);
    return true;
  }
};

/** Monitors are pinned to one agent only with an Enterprise license and rebalancing on. */
export const getAgentShardingMode = async (server: ShardingServer): Promise<AgentShardingMode> => {
  const [licenseStatus, isRebalanceEnabled] = await Promise.all([
    getAgentShardingLicenseStatus(server),
    isShardRebalanceEnabled(server),
  ]);
  if (!isRebalanceEnabled || licenseStatus === 'unlicensed') {
    return 'inactive';
  }
  return licenseStatus === 'licensed' ? 'active' : 'unknown';
};

export const isAgentShardingActive = async (server: ShardingServer): Promise<boolean> =>
  (await getAgentShardingMode(server)) === 'active';
