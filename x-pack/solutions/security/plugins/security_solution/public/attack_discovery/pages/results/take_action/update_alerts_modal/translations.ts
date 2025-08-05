/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.takeAction.confirmModal.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const MARK_ALERTS_AND_DISCOVERIES = ({
  alertsCount,
  attackDiscoveriesCount,
  workflowStatus,
}: {
  alertsCount: number;
  attackDiscoveriesCount: number;
  workflowStatus: 'open' | 'acknowledged' | 'closed';
}) => {
  return i18n.translate(
    'xpack.securitySolution.attackDiscovery.results.takeAction.confirmModal.markDiscoveriesAndAlertsButtonLabel',
    {
      defaultMessage:
        'Mark {alertsCount, plural, =1 {alert} other {alerts}} & {attackDiscoveriesCount, plural, =1 {discovery} other {discoveries}} as {workflowStatus}',
      values: {
        alertsCount,
        attackDiscoveriesCount,
        workflowStatus,
      },
    }
  );
};

export const MARK_DISCOVERIES_ONLY = ({
  attackDiscoveriesCount,
  workflowStatus,
}: {
  attackDiscoveriesCount: number;
  workflowStatus: 'open' | 'acknowledged' | 'closed';
}) => {
  return i18n.translate(
    'xpack.securitySolution.attackDiscovery.results.takeAction.confirmModal.markDiscoveriesOnlyButtonLabel',
    {
      defaultMessage:
        'Mark {attackDiscoveriesCount, plural, =1 {discovery} other {discoveries}} as {workflowStatus}',
      values: {
        attackDiscoveriesCount,
        workflowStatus,
      },
    }
  );
};

export const UPDATE_ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.takeAction.confirmModal.updateAlertsTitle',
  {
    defaultMessage: 'Update alerts?',
  }
);

export const UPDATE_ALERTS_ASSOCIATED = ({
  alertsCount,
  attackDiscoveriesCount,
}: {
  alertsCount: number;
  attackDiscoveriesCount: number;
}) => {
  return i18n.translate(
    'xpack.securitySolution.attackDiscovery.results.takeAction.confirmModal.updateAlertsAssociatedModalBody',
    {
      defaultMessage:
        'Update {alertsCount} alerts associated with {attackDiscoveriesCount, plural, =1 {the attack discovery} other {{attackDiscoveriesCount} attack discoveries}}?',
      values: {
        alertsCount,
        attackDiscoveriesCount,
      },
    }
  );
};
