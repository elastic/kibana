/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const apmActionVariables = {
  alertDetailsUrl: {
    description: i18n.translate('xpack.apm.alerts.action_variables.alertDetailsUrl', {
      defaultMessage:
        'Link to the alert troubleshooting view for further context and details. This will be an empty string if the server.publicBaseUrl is not configured.',
    }),
    name: 'alertDetailsUrl' as const,
    usesPublicBaseUrl: true,
  },
  environment: {
    description: i18n.translate('xpack.apm.alerts.action_variables.environment', {
      defaultMessage: 'The transaction type the alert is created for',
    }),
    name: 'environment' as const,
  },
  interval: {
    description: i18n.translate('xpack.apm.alerts.action_variables.intervalSize', {
      defaultMessage: 'The length and unit of the time period where the alert conditions were met',
    }),
    name: 'interval' as const,
  },
  reason: {
    description: i18n.translate('xpack.apm.alerts.action_variables.reasonMessage', {
      defaultMessage: 'A concise description of the reason for the alert',
    }),
    name: 'reason' as const,
  },
  serviceName: {
    description: i18n.translate('xpack.apm.alerts.action_variables.serviceName', {
      defaultMessage: 'The service the alert is created for',
    }),
    name: 'serviceName' as const,
  },
  threshold: {
    description: i18n.translate('xpack.apm.alerts.action_variables.threshold', {
      defaultMessage: 'Any trigger value above this value will cause the alert to fire',
    }),
    name: 'threshold' as const,
  },
  transactionType: {
    description: i18n.translate('xpack.apm.alerts.action_variables.transactionType', {
      defaultMessage: 'The transaction type the alert is created for',
    }),
    name: 'transactionType' as const,
  },
  transactionName: {
    description: i18n.translate('xpack.apm.alerts.action_variables.transactionName', {
      defaultMessage: 'The transaction name the alert is created for',
    }),
    name: 'transactionName' as const,
  },
  triggerValue: {
    description: i18n.translate('xpack.apm.alerts.action_variables.triggerValue', {
      defaultMessage: 'The value that breached the threshold and triggered the alert',
    }),
    name: 'triggerValue' as const,
  },
  viewInAppUrl: {
    description: i18n.translate('xpack.apm.alerts.action_variables.viewInAppUrl', {
      defaultMessage: 'Link to the alert source',
    }),
    name: 'viewInAppUrl' as const,
    usesPublicBaseUrl: true,
  },
  errorGroupingKey: {
    description: i18n.translate('xpack.apm.alerts.action_variables.errorGroupingKey', {
      defaultMessage: 'The error grouping key the alert is created for',
    }),
    name: 'errorGroupingKey' as const,
  },
  errorGroupingName: {
    description: i18n.translate('xpack.apm.alerts.action_variables.errorGroupingName', {
      defaultMessage: 'The error grouping name the alert is created for',
    }),
    name: 'errorGroupingName' as const,
  },
};
