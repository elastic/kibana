/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const APPROVAL_MODAL_TRANSLATIONS = Object.freeze({
  warningLabel: i18n.translate('xpack.pnd.approvalModal.warningLabel', {
    defaultMessage: 'APPROVAL REQUIRED',
  }),
  blastRadiusTitle: i18n.translate('xpack.pnd.approvalModal.blastRadiusTitle', {
    defaultMessage: 'Blast radius',
  }),
  cancel: i18n.translate('xpack.pnd.approvalModal.cancel', {
    defaultMessage: 'Cancel',
  }),
  modalAriaLabel: i18n.translate('xpack.pnd.approvalModal.ariaLabel', {
    defaultMessage: 'Approval required modal',
  }),
  alwaysAllowAriaLabel: i18n.translate('xpack.pnd.approvalModal.alwaysAllow.ariaLabel', {
    defaultMessage: 'Always allow this action',
  }),
});
