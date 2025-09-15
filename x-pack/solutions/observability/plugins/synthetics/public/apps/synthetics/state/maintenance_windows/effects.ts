/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { getMaintenanceWindows } from './api';
import { getMaintenanceWindowsAction } from './actions';
import { fetchEffectFactory } from '../utils/fetch_effect';

export function* getMaintenanceWindowsEffect() {
  yield takeLeading(
    getMaintenanceWindowsAction.get,
    fetchEffectFactory(
      getMaintenanceWindows,
      getMaintenanceWindowsAction.success,
      getMaintenanceWindowsAction.fail,
      undefined,
      getFailMessage
    )
  );
}

const getFailMessage = i18n.translate('xpack.synthetics.settings.mws.failed', {
  defaultMessage: 'Failed to fetch maintenance windows.',
});
