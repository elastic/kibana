/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertFieldMap } from '@kbn/alerts-as-data-utils';
import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import { attackDiscoveryRuleFieldMap } from './field_map';
import { AttackDiscoveryAlert } from './types';

export const attackDiscoveryRuleTypeFieldMap = {
  ...alertFieldMap,
  ...attackDiscoveryRuleFieldMap,
};

export const ATTACK_DISCOVERY_ALERTS_AAD_CONFIG: IRuleTypeAlerts<AttackDiscoveryAlert> = {
  context: 'security.attack.discovery',
  mappings: {
    // dynamic: false,
    fieldMap: attackDiscoveryRuleTypeFieldMap,
  },
  isSpaceAware: true,
  shouldWrite: true,
};
