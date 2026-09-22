/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ILicense } from '@kbn/licensing-types';
import { AGENT_SHARDING_MIN_LICENSE } from '../../../../common/constants/license';

const isEnablingAgentSharding = (
  requestedIsAgentSharding?: boolean,
  existingIsAgentSharding?: boolean
): boolean => requestedIsAgentSharding === true && existingIsAgentSharding !== true;

export const getAgentShardingLicenseError = (): string =>
  i18n.translate('xpack.synthetics.privateLocation.agentSharding.enterpriseLicenseRequired', {
    defaultMessage:
      'An Enterprise license is required to enable scalable private locations (agent sharding).',
  });

/**
 * Returns an error message when the request would turn agent sharding on
 * without an Enterprise license. Classic create/edit and turning sharding off
 * are allowed on any license.
 */
const hasAgentShardingLicense = (
  license?: Pick<ILicense, 'hasAtLeast' | 'isAvailable' | 'isActive'>
): boolean =>
  Boolean(
    license?.isAvailable && license.isActive && license.hasAtLeast(AGENT_SHARDING_MIN_LICENSE)
  );

export const assertCanEnableAgentSharding = (
  license?: Pick<ILicense, 'hasAtLeast' | 'isAvailable' | 'isActive'>,
  requestedIsAgentSharding?: boolean,
  existingIsAgentSharding?: boolean
): string | undefined => {
  if (!isEnablingAgentSharding(requestedIsAgentSharding, existingIsAgentSharding)) {
    return undefined;
  }
  if (hasAgentShardingLicense(license)) {
    return undefined;
  }
  return getAgentShardingLicenseError();
};
