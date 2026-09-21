/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { call } from 'redux-saga/effects';
import { fetchEffectFactory } from './fetch_effect';

jest.mock('../../../../utils/kibana_service', () => ({ kibanaService: {} }));

describe('fetchEffectFactory', () => {
  it('does not report an error that was canceled', () => {
    const fetch = jest.fn();
    const success = jest.fn();
    const fail = jest.fn();
    const action = { type: 'fetch', payload: {} };
    const fetchEffect = fetchEffectFactory(fetch, success, fail, undefined, undefined, () => true);
    const generator = fetchEffect(action);

    expect(generator.next().value).toEqual(call(fetch, action.payload));
    expect(generator.throw(new Error('canceled')).done).toBe(true);
    expect(fail).not.toHaveBeenCalled();
  });
});
