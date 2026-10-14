/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MISSING_PRIVILEGES_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowsMissingPrivilegesCallOut.title',
  {
    defaultMessage: 'Insufficient privileges',
  }
);

export const ESSENCE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowsMissingPrivilegesCallOut.essence',
  {
    defaultMessage:
      'You need the following privileges to fully access this functionality. Contact your administrator for further assistance.',
  }
);

export const FEATURE_PRIVILEGES_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowsMissingPrivilegesCallOut.featurePrivilegesTitle',
  {
    defaultMessage: 'Missing Kibana feature privileges:',
  }
);

export const CANNOT_MONITOR_ATTACK_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowsMissingPrivilegesCallOut.cannotMonitor',
  {
    defaultMessage: 'Without this privilege, you cannot monitor Attack discovery generations.',
  }
);

export const CANNOT_GENERATE_ATTACK_DISCOVERIES = i18n.translate(
  'xpack.securitySolution.attackDiscovery.workflowsMissingPrivilegesCallOut.cannotGenerate',
  {
    defaultMessage:
      'Without this privilege, you cannot generate Attack discoveries or manage Attack discovery schedules.',
  }
);
