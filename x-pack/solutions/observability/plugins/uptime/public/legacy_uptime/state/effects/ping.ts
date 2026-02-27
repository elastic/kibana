/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest } from 'redux-saga/effects';
import { getPingHistogram, getPings, getPingsSuccess, getPingsFail } from '../actions';
import { fetchPingHistogram, fetchPings } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchPingsEffect() {
  yield takeLatest(String(getPings), fetchEffectFactory(fetchPings, getPingsSuccess, getPingsFail));
}

export function* fetchPingHistogramEffect() {
  yield takeLatest(
    String(getPingHistogram.get),
    fetchEffectFactory(fetchPingHistogram, getPingHistogram.success, getPingHistogram.fail)
  );
}
