/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import { AttackDiscoveryAlert } from './types';
import { attackDiscoveryAlertFieldMap } from './fields';

export const ATTACK_DISCOVERY_ALERTS_AAD_CONFIG: IRuleTypeAlerts<AttackDiscoveryAlert> = {
  context: 'security.attack.discovery',
  mappings: { fieldMap: attackDiscoveryAlertFieldMap },
  isSpaceAware: true,
  shouldWrite: true,
};
