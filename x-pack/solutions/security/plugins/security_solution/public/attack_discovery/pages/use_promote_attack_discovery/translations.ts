/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PROMOTE_ATTACK_DISCOVERY_FAILURE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.promoteAttackDiscoveryFailureTitle',
  {
    defaultMessage: 'Failed to promote attacks to scheduled alerts',
  }
);

export const PROMOTE_ATTACK_DISCOVERY_SUCCESS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.promoteAttackDiscoverySuccessTitle',
  {
    defaultMessage: 'Successfully started promotion of attacks to scheduled alerts',
  }
);
