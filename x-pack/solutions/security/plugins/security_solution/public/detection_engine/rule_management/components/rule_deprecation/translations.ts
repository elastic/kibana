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
      'Delete these rules. If needed, duplicate them as custom rules before deleting to continue using them. This reminder will appear again in 7 days if dismissed.',
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

export const DELETE_RULES = (count: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.deprecation.deleteRules', {
    defaultMessage: 'Delete {count, plural, one {rule} other {rules}}',
    values: { count },
  });

export const DEPRECATED_RULES_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.deprecation.modalTitle',
  {
    defaultMessage: 'Deprecated rules',
  }
);

export const DEPRECATED_RULES_MODAL_DESCRIPTION = (count: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.deprecation.modalDescription', {
    defaultMessage:
      'The {count} installed {count, plural, one {rule} other {rules}} below {count, plural, one {has} other {have}} been deprecated and {count, plural, one {is} other {are}} no longer maintained. Click on a rule name to view the details. If you wish to keep a rule you can duplicate the rule before deletion.',
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
        '{count, plural, one {This rule is} other {These rules are}} deprecated and will no longer receive updates. This action cannot be undone.',
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
