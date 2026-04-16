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
      '{count} of your installed Elastic {count, plural, one {rule has} other {rules have}} been deprecated and {count, plural, one {is} other {are}} no longer being maintained',
    values: { count },
  });

export const DEPRECATION_TABLE_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.tableCalloutDescription',
  {
    defaultMessage:
      "These rules have been deprecated. They won't receive new updates or fixes. If you still need them, duplicate them as custom rules. Otherwise, you can delete them now. You can revisit this anytime, or dismiss to be reminded in 7 days.",
  }
);

export const DEPRECATION_DETAILS_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.detailsCalloutTitle',
  {
    defaultMessage: 'This rule has been deprecated and is no longer being maintained.',
  }
);

export const DEPRECATION_DETAILS_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.detailsCalloutDescription',
  {
    defaultMessage:
      "This rule won't receive new updates or fixes. If you still need it, duplicate it as a custom rule. Otherwise, you can delete it now.",
  }
);

export const DELETE_DEPRECATED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.deleteDeprecatedRules',
  {
    defaultMessage: 'Delete deprecated rules',
  }
);

export const REVIEW_DEPRECATED_RULES = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.reviewDeprecatedRules',
  {
    defaultMessage: 'Review deprecated rules',
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

export const DEPRECATED_RULES_MODAL_DESCRIPTION = (count: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.deprecation.modalDescription', {
    defaultMessage:
      "You have {count} deprecated {count, plural, one {rule} other {rules}} installed. {count, plural, one {This rule is} other {These rules are}} no longer receiving updates or fixes. Click a rule name to see its details. If you'd like to keep using a rule, duplicate it as a custom rule before deleting it.",
    values: { count },
  });

export const CLOSE_MODAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.close',
  {
    defaultMessage: 'Close',
  }
);

export const DELETE_ALL_DEPRECATED_RULES = (count: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.deprecation.deleteAllDeprecatedRules', {
    defaultMessage: 'Delete {count} deprecated {count, plural, one {rule} other {rules}}',
    values: { count },
  });

export const DELETE_ALL_CONFIRMATION_TITLE = (count: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.deprecation.deleteAllConfirmationTitle', {
    defaultMessage: 'Delete {count} deprecated {count, plural, one {rule} other {rules}}?',
    values: { count },
  });

export const DELETE_ALL_CONFIRMATION_DESCRIPTION = (count: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.deprecation.deleteAllConfirmationDescription',
    {
      defaultMessage:
        '{count, plural, one {This rule is} other {These rules are}} deprecated and will no longer receive updates or fixes. This action cannot be undone.',
      values: { count },
    }
  );

export const CANCEL_DELETE = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.cancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const DUPLICATE_AND_DELETE_RULE = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.duplicateAndDeleteRule',
  {
    defaultMessage: 'Duplicate and delete',
  }
);

export const DEPRECATION_REASON_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.reasonLabel',
  {
    defaultMessage: 'Deprecation reason:',
  }
);
