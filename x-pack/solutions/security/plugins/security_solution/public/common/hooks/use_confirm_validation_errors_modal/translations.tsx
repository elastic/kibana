/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SAVE_WITH_ERRORS_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.saveWithErrorsConfirmationModal.title',
  {
    defaultMessage: 'There are validation errors',
  }
);

export const CANCEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.saveWithErrorsConfirmationModal.cancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const CONFIRM = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.saveWithErrorsConfirmationModal.confirm',
  {
    defaultMessage: 'Confirm',
  }
);

export const SAVE_WITH_ERRORS_MESSAGE = (errorsCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.createRule.saveWithErrorsModalMessage', {
    defaultMessage:
      'There {errorsCount, plural, one {is} other {are}} {errorsCount} validation {errorsCount, plural, one {error} other {errors}} which can lead to failed rule executions, save anyway?',
    values: { errorsCount },
  });
