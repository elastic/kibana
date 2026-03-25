/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DEPRECATION_CALLOUT_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.deprecation.calloutTitle', {
    defaultMessage:
      '{count} installed Elastic {count, plural, one {rule has} other {rules have}} been deprecated and {count, plural, one {is} other {are}} no longer maintained',
    values: { count },
  });

export const DEPRECATION_TABLE_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.tableCalloutDescription',
  {
    defaultMessage:
      'Delete these rules. If needed, duplicate them as custom rules before deleting to continue using them.',
  }
);

export const DEPRECATION_DETAILS_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.detailsCalloutTitle',
  {
    defaultMessage: 'This rule has been deprecated and is no longer maintained.',
  }
);

export const DEPRECATION_DETAILS_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.detailsCalloutDescription',
  {
    defaultMessage:
      'Delete this rule. If needed, duplicate it as custom rule before deleting to continue using it.',
  }
);

export const REVIEW_DEPRECATED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.reviewDeprecatedRules',
  {
    defaultMessage: 'View deprecated rules',
  }
);

export const DELETE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.deleteRule',
  {
    defaultMessage: 'Delete rule',
  }
);

export const DEPRECATED_RULES_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.modalTitle',
  {
    defaultMessage: 'Deprecated rules',
  }
);

export const DEPRECATED_RULES_MODAL_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.modalDescription',
  {
    defaultMessage:
      'The following installed rules have been deprecated by Elastic. Navigate to a rule to review and remove it.',
  }
);

export const CLOSE = i18n.translate('xpack.securitySolution.detectionEngine.deprecation.close', {
  defaultMessage: 'Close',
});
