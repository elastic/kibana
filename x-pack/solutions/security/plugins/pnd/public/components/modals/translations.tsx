/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MODAL_TRANSLATIONS = Object.freeze({
  assign: {
    title: i18n.translate('xpack.pnd.assignModal.title', {
      defaultMessage: 'Assign proposal',
    }),
    rationalePlaceholder: i18n.translate('xpack.pnd.assignModal.rationalePlaceholder', {
      defaultMessage: 'What should the assignee focus on?',
    }),
    actionButtonLabel: i18n.translate('xpack.pnd.assignModal.actionButtonLabel', {
      defaultMessage: 'Assign',
    }),
    assigneeSelectAriaLabel: i18n.translate('xpack.pnd.assignModal.assigneeSelectAriaLabel', {
      defaultMessage: 'Select assignee',
    }),
  },
  dismiss: {
    title: i18n.translate('xpack.pnd.dismissModal.title', {
      defaultMessage: 'Dismiss proposal',
    }),
    rationalePlaceholder: i18n.translate('xpack.pnd.dismissModal.rationalePlaceholder', {
      defaultMessage: 'Why are you dismissing this proposal?',
    }),
    actionButtonLabel: i18n.translate('xpack.pnd.dismissModal.actionButtonLabel', {
      defaultMessage: 'Dismiss',
    }),
  },
});
