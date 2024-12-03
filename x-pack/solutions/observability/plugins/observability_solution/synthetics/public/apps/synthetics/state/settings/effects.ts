/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading, put, call, takeLatest } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { updateDefaultAlertingAction } from '../alert_rules';
import { DynamicSettings } from '../../../../../common/runtime_types';
import { kibanaService } from '../../../../utils/kibana_service';
import {
  getConnectorsAction,
  setDynamicSettingsAction,
  getDynamicSettingsAction,
  syncGlobalParamsAction,
  getLocationMonitorsAction,
} from './actions';
import { fetchEffectFactory } from '../utils/fetch_effect';
import {
  fetchConnectors,
  setDynamicSettings,
  syncGlobalParamsAPI,
  getDynamicSettings,
  fetchLocationMonitors,
} from './api';

export function* syncGlobalParamsEffect() {
  yield takeLeading(
    syncGlobalParamsAction.get,
    fetchEffectFactory(
      syncGlobalParamsAPI,
      syncGlobalParamsAction.success,
      syncGlobalParamsAction.fail,
      successMessage,
      failureMessage
    )
  );
}

export function* fetchLocationMonitorsEffect() {
  yield takeLeading(
    String(getLocationMonitorsAction.get),
    fetchEffectFactory(
      fetchLocationMonitors,
      getLocationMonitorsAction.success,
      getLocationMonitorsAction.fail
    )
  );
}

export function* fetchDynamicSettingsEffect() {
  yield takeLeading(
    String(getDynamicSettingsAction.get),
    fetchEffectFactory(
      getDynamicSettings,
      getDynamicSettingsAction.success,
      getDynamicSettingsAction.fail
    )
  );
}

const successMessage = i18n.translate('xpack.synthetics.settings.syncGlobalParams', {
  defaultMessage: 'Successfully applied global params to all monitors',
});

const failureMessage = i18n.translate('xpack.synthetics.settings.syncGlobalParams.fail', {
  defaultMessage: 'Failed to apply global params to all monitors',
});

export function* setDynamicSettingsEffect() {
  const couldNotSaveSettingsText = i18n.translate('xpack.synthetics.settings.error.couldNotSave', {
    defaultMessage: 'Could not save settings!',
  });
  yield takeLatest(
    String(setDynamicSettingsAction.get),
    function* (action: Action<DynamicSettings>) {
      try {
        yield call(setDynamicSettings, { settings: action.payload });
        yield put(updateDefaultAlertingAction.get());
        yield put(setDynamicSettingsAction.success(action.payload));
        kibanaService.coreSetup.notifications.toasts.addSuccess(
          i18n.translate('xpack.synthetics.settings.saveSuccess', {
            defaultMessage: 'Settings saved!',
          })
        );
      } catch (err) {
        kibanaService.coreSetup.notifications.toasts.addError(err, {
          title: couldNotSaveSettingsText,
        });
        yield put(setDynamicSettingsAction.fail(err));
      }
    }
  );
}

export function* fetchAlertConnectorsEffect() {
  yield takeLeading(
    String(getConnectorsAction.get),
    fetchEffectFactory(fetchConnectors, getConnectorsAction.success, getConnectorsAction.fail)
  );
}
