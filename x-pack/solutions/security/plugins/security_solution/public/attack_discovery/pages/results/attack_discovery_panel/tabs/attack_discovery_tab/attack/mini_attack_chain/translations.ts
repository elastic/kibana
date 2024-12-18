/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_CHAIN_TOOLTIP = (tacticsCount: number) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.miniAttackChain.attackChainTooltip', {
    defaultMessage:
      '{tacticsCount} {tacticsCount, plural, one {tactic was} other {tactics were}} identified in the attack:',
    values: { tacticsCount },
  });
