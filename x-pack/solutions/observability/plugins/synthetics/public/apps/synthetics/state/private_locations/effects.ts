/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { put, takeEvery, takeLeading } from 'redux-saga/effects';
import { getServiceLocations } from '..';
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
      createPrivateLocationAction.fail
    )
  );
}

function* watchCreateSuccessEffect() {
  yield takeEvery(createPrivateLocationAction.success, function* resetLocations() {
    yield put({ type: getPrivateLocationsAction.get() });
    yield put({ type: getServiceLocations() });
  });
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

function* watchDeleteSuccessEffect() {
  yield takeEvery(deletePrivateLocationAction.success, function* resetLocations() {
    yield put({ type: getPrivateLocationsAction.get() });
    yield put({ type: getServiceLocations() });
  });
}

export const privateLocationsEffects = [
  fetchPrivateLocationsEffect,
  createPrivateLocationEffect,
  deletePrivateLocationEffect,
  watchCreateSuccessEffect,
  watchDeleteSuccessEffect,
];
