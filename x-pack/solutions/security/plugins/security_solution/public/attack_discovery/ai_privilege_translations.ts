/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_AI_ASSISTANT_PRIVILEGE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.aiPrivilege.calloutTitle',
  {
    defaultMessage: 'Attack discovery requires Elastic AI Assistant access',
  }
);

export const NO_AI_ASSISTANT_PRIVILEGE_CALLOUT_BODY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.aiPrivilege.calloutBody',
  {
    defaultMessage:
      'Your role has AI set to None or does not include Elastic AI Assistant privileges. An administrator can update your role to grant access, then you can run and generate attack discoveries.',
  }
);

export const NO_AI_ASSISTANT_PRIVILEGE_CONTROL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.attackDiscovery.aiPrivilege.controlTooltip',
  {
    defaultMessage: 'You need Elastic AI Assistant privileges to run attack discovery',
  }
);
