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
    defaultMessage: 'Get more from Attack Discovery with workflows',
  }
);

export const CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.description',
  {
    defaultMessage:
      'Enabling Attack Discovery Workflows powers every run with the Attack Discovery skill: it investigates alerts across threat hunting, entity analytics, and alert analysis, surfaces related activity, and proposes rules for gaps in your detections. Follow each run step by step, or plug in your own retrieval and validation workflows.',
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

export const CALLOUT_MISSING_PRIVILEGES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.missingPrivilegesDescription',
  {
    defaultMessage:
      'Enabling this requires permission to edit Advanced Settings. Ask your admin to turn on the Attack Discovery Workflows setting for this space.',
  }
);

export const CALLOUT_LEARN_MORE = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.learnMore',
  {
    defaultMessage: 'Learn more',
  }
);

export const CALLOUT_ENABLE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.attacksPage.workflowsPromotionCallout.enableErrorTitle',
  {
    defaultMessage: 'Failed to enable Attack Discovery Workflows',
  }
);
