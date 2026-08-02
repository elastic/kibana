/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.pnd.ruleIdConfirmDialog.title', {
  defaultMessage: 'Confirm the detection rule to change',
});

export const RULE_ID_LABEL = i18n.translate('xpack.pnd.ruleIdConfirmDialog.ruleIdLabel', {
  defaultMessage: 'Detection rule id',
});

export const RULE_ID_HELP = i18n.translate('xpack.pnd.ruleIdConfirmDialog.ruleIdHelp', {
  defaultMessage:
    'The model proposed this id and it may not name a real rule. Confirm it, or replace it with the rule you mean to change.',
});

export const RULE_ID_REQUIRED = i18n.translate('xpack.pnd.ruleIdConfirmDialog.ruleIdRequired', {
  defaultMessage: 'A detection rule id is required.',
});

export const RATIONALE_LABEL = i18n.translate('xpack.pnd.ruleIdConfirmDialog.rationaleLabel', {
  defaultMessage: 'Rationale',
});

export const RATIONALE_HELP = i18n.translate('xpack.pnd.ruleIdConfirmDialog.rationaleHelp', {
  defaultMessage: 'Recorded with the decision. There is no rationale-free path.',
});

export const RATIONALE_REQUIRED = i18n.translate(
  'xpack.pnd.ruleIdConfirmDialog.rationaleRequired',
  {
    defaultMessage: 'A rationale is required.',
  }
);

export const CANCEL = i18n.translate('xpack.pnd.ruleIdConfirmDialog.cancel', {
  defaultMessage: 'Cancel',
});

export const CONFIRM = i18n.translate('xpack.pnd.ruleIdConfirmDialog.confirm', {
  defaultMessage: 'Apply change',
});

export const ERROR_TITLE = i18n.translate('xpack.pnd.ruleIdConfirmDialog.errorTitle', {
  defaultMessage: 'The change was not applied',
});
