/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.title',
  {
    defaultMessage: 'A new way to run and schedule Attack Discovery',
  }
);

export const CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.description',
  {
    defaultMessage:
      'Get more control over on-demand runs and schedules. Enabling turns on Attack Discovery Workflows for this space only — nothing runs and existing schedules don’t change until you say so.',
  }
);

export const CALLOUT_ENABLE_BUTTON = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.enableButton',
  {
    defaultMessage: 'Enable for this space',
  }
);

export const CALLOUT_DISMISS_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.dismissAriaLabel',
  {
    defaultMessage: 'Dismiss',
  }
);

export const CALLOUT_MISSING_PRIVILEGES = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.missingPrivileges',
  {
    defaultMessage:
      'Ask an administrator with permission to edit Advanced Settings to enable Attack Discovery Workflows for this space.',
  }
);

export const CALLOUT_ENABLE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.enableErrorTitle',
  {
    defaultMessage: 'Failed to enable Attack Discovery Workflows',
  }
);
