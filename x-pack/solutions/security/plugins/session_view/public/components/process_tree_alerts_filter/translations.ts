/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SELECTED_PROCESS = {
  all: i18n.translate('xpack.sessionView.alertDetailsAllSelectedCategory', {
    defaultMessage: 'View: all alerts',
  }),
  process: i18n.translate('xpack.sessionView.alertDetailsProcessSelectedCategory', {
    defaultMessage: 'View: process alerts',
  }),
  network: i18n.translate('xpack.sessionView.alertDetailsNetworkSelectedCategory', {
    defaultMessage: 'View: network alerts',
  }),
  file: i18n.translate('xpack.sessionView.alertDetailsFileSelectedCategory', {
    defaultMessage: 'View: file alerts',
  }),
};

export const FILTER_MENU_OPTIONS = {
  all: i18n.translate('xpack.sessionView.alertDetailsAllFilterItem', {
    defaultMessage: 'View all alerts',
  }),
  process: i18n.translate('xpack.sessionView.alertDetailsProcessFilterItem', {
    defaultMessage: 'View process alerts',
  }),
  network: i18n.translate('xpack.sessionView.alertDetailsNetworkFilterItem', {
    defaultMessage: 'View network alerts',
  }),
  file: i18n.translate('xpack.sessionView.alertDetailsFileFilterItem', {
    defaultMessage: 'View file alerts',
  }),
};
