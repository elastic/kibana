/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.pnd.proposedRuleChange.title', {
  defaultMessage: 'Proposed change',
});

export const RULE_ID = i18n.translate('xpack.pnd.proposedRuleChange.ruleIdLabel', {
  defaultMessage: 'Rule id',
});

export const DISABLE_RULE = i18n.translate('xpack.pnd.proposedRuleChange.disableRule', {
  defaultMessage: 'Disable rule',
});

export const ENABLE_RULE = i18n.translate('xpack.pnd.proposedRuleChange.enableRule', {
  defaultMessage: 'Enable rule',
});

export const ENABLED_UNCLEAR = i18n.translate('xpack.pnd.proposedRuleChange.enabledUnclear', {
  defaultMessage: 'Change whether the rule is enabled',
});

export const UPDATE_INVESTIGATION_FIELDS = i18n.translate(
  'xpack.pnd.proposedRuleChange.updateInvestigationFields',
  {
    defaultMessage: 'Update investigation fields',
  }
);

export const UPDATE_INVESTIGATION_GUIDE = i18n.translate(
  'xpack.pnd.proposedRuleChange.updateInvestigationGuide',
  {
    defaultMessage: 'Update investigation guide',
  }
);

export const UPDATE_RULE_QUERY = i18n.translate('xpack.pnd.proposedRuleChange.updateRuleQuery', {
  defaultMessage: 'Update rule query',
});

export const EMPTY_TITLE = i18n.translate('xpack.pnd.proposedRuleChange.emptyTitle', {
  defaultMessage: 'No change proposed',
});

export const EMPTY_BODY = i18n.translate('xpack.pnd.proposedRuleChange.emptyBody', {
  defaultMessage:
    'The tuning action carries no rule change, so approving it would not change any detection rule.',
});

export const UNSUPPORTED_TITLE = i18n.translate('xpack.pnd.proposedRuleChange.unsupportedTitle', {
  defaultMessage: 'This change cannot be applied',
});

export const investigationFieldNames = (fieldNames: string): string =>
  i18n.translate('xpack.pnd.proposedRuleChange.investigationFieldNames', {
    defaultMessage: 'Fields: {fieldNames}',
    values: { fieldNames },
  });

export const unsupportedBody = (fields: string, permittedFields: string): string =>
  i18n.translate('xpack.pnd.proposedRuleChange.unsupportedBody', {
    defaultMessage:
      'The action changes {fields}, which AlertZero is not allowed to patch. Applying it will be rejected. AlertZero may only change: {permittedFields}.',
    values: { fields, permittedFields },
  });
