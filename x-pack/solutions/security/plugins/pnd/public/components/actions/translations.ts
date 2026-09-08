/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const ACTIONS_TRANSLATIONS = Object.freeze({
  popover: {
    ariaLabel: i18n.translate('xpack.pnd.baseActions.popover.ariaLabel', {
      defaultMessage: 'Actions menu',
    }),
  },
  buttons: {
    actions: i18n.translate('xpack.pnd.baseActions.actions', {
      defaultMessage: 'Actions',
    }),
    openInChat: i18n.translate('xpack.pnd.baseActions.openInChat', {
      defaultMessage: 'Open in chat',
    }),
    openIncident: i18n.translate('xpack.pnd.baseActions.openIncident', {
      defaultMessage: 'Open an incident',
    }),
    assign: i18n.translate('xpack.pnd.baseActions.assign', {
      defaultMessage: 'Assign',
    }),
    dismiss: i18n.translate('xpack.pnd.baseActions.dismiss', {
      defaultMessage: 'Dismiss',
    }),
  },
  tooltips: {
    openMenu: i18n.translate('xpack.pnd.baseActions.openMenu', {
      defaultMessage: 'Open actions menu',
    }),
    openInChat: i18n.translate('xpack.pnd.baseActions.openInChat', {
      defaultMessage: 'Open in chat',
    }),
  },
});
