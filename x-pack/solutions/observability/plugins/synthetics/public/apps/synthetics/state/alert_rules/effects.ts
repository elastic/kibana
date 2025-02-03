/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import {
  enableDefaultAlertingAction,
  enableDefaultAlertingSilentlyAction,
  getDefaultAlertingAction,
  inspectStatusRuleAction,
  updateDefaultAlertingAction,
} from './actions';
import { fetchEffectFactory } from '../utils/fetch_effect';
import {
  enableDefaultAlertingAPI,
  getDefaultAlertingAPI,
  inspectStatusAlertAPI,
  updateDefaultAlertingAPI,
} from './api';

export function* getDefaultAlertingEffect() {
  yield takeLeading(
    getDefaultAlertingAction.get,
    fetchEffectFactory(
      getDefaultAlertingAPI,
      enableDefaultAlertingAction.success,
      enableDefaultAlertingAction.fail,
      undefined,
      failureMessage
    )
  );
}

export function* enableDefaultAlertingEffect() {
  yield takeLeading(
    enableDefaultAlertingAction.get,
    fetchEffectFactory(
      enableDefaultAlertingAPI,
      enableDefaultAlertingAction.success,
      enableDefaultAlertingAction.fail,
      successMessage,
      failureMessage
    )
  );
}

export function* enableDefaultAlertingSilentlyEffect() {
  yield takeLeading(
    enableDefaultAlertingSilentlyAction.get,
    fetchEffectFactory(
      enableDefaultAlertingAPI,
      enableDefaultAlertingAction.success,
      enableDefaultAlertingAction.fail,
      undefined,
      failureMessage
    )
  );
}

export function* updateDefaultAlertingEffect() {
  yield takeLeading(
    updateDefaultAlertingAction.get,
    fetchEffectFactory(
      updateDefaultAlertingAPI,
      updateDefaultAlertingAction.success,
      updateDefaultAlertingAction.fail,
      successMessage,
      failureMessage
    )
  );
}

export function* inspectStatusRuleEffect() {
  yield takeLeading(
    inspectStatusRuleAction.get,
    fetchEffectFactory(
      inspectStatusAlertAPI,
      inspectStatusRuleAction.success,
      inspectStatusRuleAction.fail,
      '',
      i18n.translate('xpack.synthetics.settings.statusRule.inspect', {
        defaultMessage: 'Failed to inspect monitor status rule type.',
      })
    )
  );
}

const successMessage = i18n.translate('xpack.synthetics.settings.enableAlerting', {
  defaultMessage:
    'Monitor status rule successfully updated. Changes will take effect on the next rule execution.',
});

const failureMessage = i18n.translate('xpack.synthetics.settings.enabledAlert.fail', {
  defaultMessage: 'Failed to update monitor status rule type.',
});
