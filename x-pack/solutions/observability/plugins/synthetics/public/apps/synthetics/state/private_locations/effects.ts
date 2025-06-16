/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { fetchEffectFactory } from '../utils/fetch_effect';
import {
  createSyntheticsPrivateLocation,
  deleteSyntheticsPrivateLocation,
  getSyntheticsPrivateLocations,
} from './api';
import {
  createPrivateLocationAction,
  deletePrivateLocationAction,
  getPrivateLocationsAction,
} from './actions';

export function* fetchPrivateLocationsEffect() {
  yield takeLeading(
    getPrivateLocationsAction.get,
    fetchEffectFactory(
      getSyntheticsPrivateLocations,
      getPrivateLocationsAction.success,
      getPrivateLocationsAction.fail
    )
  );
}

export function* createPrivateLocationEffect() {
  yield takeLeading(
    createPrivateLocationAction.get,
    fetchEffectFactory(
      createSyntheticsPrivateLocation,
      createPrivateLocationAction.success,
      createPrivateLocationAction.fail,
      i18n.translate('xpack.synthetics.createPrivateLocationSuccess', {
        defaultMessage: 'Successfully created private location.',
      }),
      i18n.translate('xpack.synthetics.createPrivateLocationFailure', {
        defaultMessage: 'Failed to create private location.',
      })
    )
  );
}

export function* deletePrivateLocationEffect() {
  yield takeLeading(
    deletePrivateLocationAction.get,
    fetchEffectFactory(
      deleteSyntheticsPrivateLocation,
      deletePrivateLocationAction.success,
      deletePrivateLocationAction.fail
    )
  );
}

export const privateLocationsEffects = [
  fetchPrivateLocationsEffect,
  createPrivateLocationEffect,
  deletePrivateLocationEffect,
];
