/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_ALERTS_TRUNCATED = ({
  alertCount,
  attachedAlertCount,
  attackCount,
  maxAlertsPerCase,
}: {
  alertCount: number;
  attachedAlertCount: number;
  attackCount: number;
  maxAlertsPerCase: number;
}) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.attackAlertsTruncatedWarningTitle', {
    defaultMessage:
      'Only {attachedAlertCount} of the {alertCount} alerts in {attackCount, plural, one {this attack} other {these # attacks}} were added. A case holds at most {maxAlertsPerCase} alerts.',
    values: {
      alertCount,
      attachedAlertCount,
      attackCount,
      maxAlertsPerCase,
    },
  });

export const ATTACKS_TRUNCATED = ({
  attackCount,
  attachedAttackCount,
  maxAttacks,
}: {
  attackCount: number;
  attachedAttackCount: number;
  maxAttacks: number;
}) =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.attacksTruncatedWarningTitle', {
    defaultMessage:
      'Only {attachedAttackCount} of the {attackCount} selected attacks were added. At most {maxAttacks} attacks can be added at a time.',
    values: {
      attackCount,
      attachedAttackCount,
      maxAttacks,
    },
  });
