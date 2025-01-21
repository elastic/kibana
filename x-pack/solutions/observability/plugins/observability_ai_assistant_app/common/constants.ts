/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';

import { AlertStatus } from './types';

export const ALERT_STATUS_ALL = 'all';

export const ACTIVE_ALERTS: AlertStatus = {
  id: ALERT_STATUS_ACTIVE,
  label: i18n.translate('xpack.observabilityAiAssistant.alertConnector.alertStatus.active', {
    defaultMessage: 'Active',
  }),
};

export const RECOVERED_ALERTS: AlertStatus = {
  id: ALERT_STATUS_RECOVERED,
  label: i18n.translate('xpack.observabilityAiAssistant.alertConnector.alertStatus.recovered', {
    defaultMessage: 'Recovered',
  }),
};

export const UNTRACKED_ALERTS: AlertStatus = {
  id: ALERT_STATUS_UNTRACKED,
  label: i18n.translate('xpack.observabilityAiAssistant.alertConnector.alertStatus.untracked', {
    defaultMessage: 'Untracked',
  }),
};

export const ALERT_STATUSES = [ACTIVE_ALERTS, RECOVERED_ALERTS, UNTRACKED_ALERTS];
