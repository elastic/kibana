/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MARKED_ATTACK_DISCOVERIES = ({
  attackDiscoveries,
  kibanaAlertWorkflowStatus,
}: {
  attackDiscoveries: number;
  kibanaAlertWorkflowStatus: 'open' | 'acknowledged' | 'closed';
}) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.useAttackDiscoveryBulk.markedAttackDiscoveriesToast',
    {
      defaultMessage:
        'Marked {attackDiscoveries, plural, one {attack discovery} other {# attack discoveries}} as {kibanaAlertWorkflowStatus}',
      values: { attackDiscoveries, kibanaAlertWorkflowStatus },
    }
  );

export const ERROR_UPDATING_ATTACK_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.useAttackDiscoveryBulk.errorUpdatingAttackDiscoveriesErrorToast',
  {
    defaultMessage: 'Error updating Attack discoveries',
  }
);
