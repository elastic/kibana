/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { AttackDiscoveryScheduleExecutionStatus } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';

export const getExecutionStatusHealthColor = (
  status: AttackDiscoveryScheduleExecutionStatus,
  euiTheme: EuiThemeComputed
) => {
  switch (status) {
    case 'active':
    case 'ok':
      return euiTheme.colors.success;
    case 'error':
      return euiTheme.colors.danger;
    case 'warning':
      return euiTheme.colors.warning;
    default:
      return 'subdued';
  }
};

export const getExecutionStatusLabel = (status: AttackDiscoveryScheduleExecutionStatus) => {
  switch (status) {
    case 'active':
    case 'ok':
      return i18n.STATUS_SUCCESS;
    case 'error':
      return i18n.STATUS_FAILED;
    case 'warning':
      return i18n.STATUS_WARNING;
    default:
      return i18n.STATUS_UNKNOWN;
  }
};
