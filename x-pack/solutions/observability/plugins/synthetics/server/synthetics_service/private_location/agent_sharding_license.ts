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
