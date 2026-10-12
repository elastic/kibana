/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.pageTitle',
  {
    defaultMessage: 'Rule details',
  }
);

export const ENABLED_BADGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.enabledBadgeLabel',
  {
    defaultMessage: 'Enabled',
  }
);

export const DISABLED_BADGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.disabledBadgeLabel',
  {
    defaultMessage: 'Disabled',
  }
);

export const ENABLE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.enableRuleLabel',
  {
    defaultMessage: 'Enable',
  }
);

export const DISABLE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.disableRuleLabel',
  {
    defaultMessage: 'Disable',
  }
);

export const REFRESH_STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.refreshStatusLabel',
  {
    defaultMessage: 'Refresh status',
  }
);

export const STATUS_AT = (status: string, date: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleDetails.statusAtMetadata', {
    defaultMessage: '{status} at {date}',
    values: { status, date },
  });

export const CREATED_BY_ON = (createdBy: string, date: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleDetails.createdByMetadata', {
    defaultMessage: 'Created by: {createdBy} on {date}',
    values: { createdBy, date },
  });

export const UPDATED_BY_ON = (updatedBy: string, date: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleDetails.updatedByMetadata', {
    defaultMessage: 'Updated by: {updatedBy} on {date}',
    values: { updatedBy, date },
  });

export const UNKNOWN = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.unknownDescription',
  {
    defaultMessage: 'Unknown',
  }
);

export const OVERVIEW_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.overviewTab',
  {
    defaultMessage: 'Overview',
  }
);

export const ALERTS_TAB = i18n.translate('xpack.securitySolution.detectionEngine.alertTitle', {
  defaultMessage: 'Alerts',
});

export const EXCEPTIONS_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExceptionsTab',
  {
    defaultMessage: 'Rule exceptions',
  }
);

export const ENDPOINT_EXCEPTIONS_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.endpointExceptionsTab',
  {
    defaultMessage: 'Endpoint exceptions',
  }
);

export const EXECUTION_RESULTS_TAB = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.ruleExecutionResultsTab',
  {
    defaultMessage: 'Execution results',
  }
);

export const DELETED_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.deletedRule',
  {
    defaultMessage: 'Deleted rule',
  }
);

export const DELETE_CONFIRMATION_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.deleteRuleConfirmationBody',
  {
    defaultMessage: 'This action will delete the rule. Click "Delete" to continue.',
  }
);

export const SOURCE_ADDRESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.groups.sourceAddress',
  {
    defaultMessage: 'Source address',
  }
);

export const USER_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.groups.userName',
  {
    defaultMessage: 'User name',
  }
);

export const HOST_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.groups.hostName',
  {
    defaultMessage: 'Host name',
  }
);

export const DESTINATION_ADDRESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.groups.destinationAddress',
  {
    defaultMessage: 'Destination address',
  }
);

export const SET_SNOOZE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.setSnoozeLabel',
  {
    defaultMessage: 'Set snooze',
  }
);

export const SNOOZED_BADGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.snoozedBadgeLabel',
  {
    defaultMessage: 'Snoozed',
  }
);

export const SNOOZED_INDEFINITELY = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.snoozedIndefinitelyTooltip',
  {
    defaultMessage: 'Notifications snoozed indefinitely',
  }
);

export const SNOOZING_FOR = (timeLeft: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleDetails.snoozingForTooltip', {
    defaultMessage: 'Notifications snoozing for {timeLeft}',
    values: { timeLeft },
  });

export const SNOOZE_SCHEDULED = (startDate: string) =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleDetails.snoozeScheduledTooltip', {
    defaultMessage: 'Notifications scheduled to snooze starting {startDate}',
    values: { startDate },
  });

export const UNABLE_TO_LOAD_SNOOZE_SETTINGS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.unableToLoadSnoozeSettingsTitle',
  {
    defaultMessage: 'Unable to load rule snooze settings',
  }
);

export const ELASTIC_VERSION_BADGE = (version: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleDetails.elasticVersionBadgeLabel', {
    defaultMessage: 'Elastic version: {version}',
    values: { version },
  });

export const REVISION_BADGE = (revision: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.ruleDetails.revisionBadgeLabel', {
    defaultMessage: 'Revision: {revision}',
    values: { revision },
  });
