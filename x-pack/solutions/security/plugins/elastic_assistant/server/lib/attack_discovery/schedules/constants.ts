/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import { attackDiscoveryAlertFieldMap } from './fields';
import { AttackDiscoveryAlertDocument } from './types';

export const SECURITY_APP_PATH = `/app/security` as const;

export const ATTACK_DISCOVERY_ALERTS_CONTEXT = 'security.attack.discovery' as const;

export const ATTACK_DISCOVERY_ALERTS_AAD_CONFIG: IRuleTypeAlerts<AttackDiscoveryAlertDocument> = {
  context: ATTACK_DISCOVERY_ALERTS_CONTEXT,
  mappings: { fieldMap: attackDiscoveryAlertFieldMap },
  isSpaceAware: true,
  shouldWrite: true,
  useEcs: true,
};
