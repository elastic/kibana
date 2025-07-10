/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_UPDATING_ALERTS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.results.takeAction.useUpdateAlerts.errorUpdatingAlertsTitle',
  {
    defaultMessage: 'Unable to update alerts',
  }
);

export const PARTIALLY_UPDATED_ALERTS = ({
  alertsCount,
  kibanaAlertWorkflowStatus,
  updated,
}: {
  alertsCount: number;
  kibanaAlertWorkflowStatus: 'open' | 'acknowledged' | 'closed';
  updated: number;
}) => {
  return i18n.translate(
    'xpack.securitySolution.attackDiscovery.results.takeAction.useUpdateAlerts.partiallyUpdatedAlertsMessage',
    {
      defaultMessage:
        'Marked {updated} out of {alertsCount} alerts as {kibanaAlertWorkflowStatus}. {notUpdated, plural, =1 {1 alert could not be updated.} other {{notUpdated} alerts could not be updated.}}',
      values: {
        alertsCount,
        kibanaAlertWorkflowStatus,
        notUpdated: alertsCount - updated,
        updated,
      },
    }
  );
};

export const SUCCESSFULLY_MARKED_ALERTS = ({
  kibanaAlertWorkflowStatus,
  updated,
}: {
  kibanaAlertWorkflowStatus: 'open' | 'acknowledged' | 'closed';
  updated: number;
}) => {
  return i18n.translate(
    'xpack.securitySolution.attackDiscovery.results.takeAction.useUpdateAlerts.successfullyMarkedAlertsMessage',
    {
      defaultMessage:
        'Marked {updated, plural, =1 {1 alert} other {{updated} alerts}} as {kibanaAlertWorkflowStatus}',
      values: {
        updated,
        kibanaAlertWorkflowStatus,
      },
    }
  );
};

export const UPDATED_ALERTS_WITH_VERSION_CONFLICTS = ({
  kibanaAlertWorkflowStatus,
  updated,
  versionConflicts,
}: {
  kibanaAlertWorkflowStatus: 'open' | 'acknowledged' | 'closed';
  updated: number;
  versionConflicts: number;
}) => {
  return i18n.translate(
    'xpack.securitySolution.attackDiscovery.results.takeAction.useUpdateAlerts.updatedAlertsWithVersionConflictsMessage',
    {
      defaultMessage:
        '{updated, plural, =0 {No alerts were marked as {kibanaAlertWorkflowStatus}} =1 {Marked 1 alert as {kibanaAlertWorkflowStatus}} other {Marked {updated} alerts as {kibanaAlertWorkflowStatus}}} {versionConflicts, plural, =1 {1 alert could not be updated due to a version conflict.} other {{versionConflicts} alerts could not be updated due to version conflicts.}}',
      values: {
        kibanaAlertWorkflowStatus,
        updated,
        versionConflicts,
      },
    }
  );
};
