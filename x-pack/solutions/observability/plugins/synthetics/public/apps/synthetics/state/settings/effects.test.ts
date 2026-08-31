/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { call, put, select } from 'redux-saga/effects';
import type { ForkEffect } from 'redux-saga/effects';
import type { Action } from 'redux-actions';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';
import type { DynamicSettings } from '../../../../../common/runtime_types';
import { updateDefaultAlertingAction } from '../alert_rules';
import { setDynamicSettingsAction } from './actions';
import { setDynamicSettings } from './api';
import { setDynamicSettingsEffect } from './effects';
import { selectDynamicSettings } from './selectors';

jest.mock('./api', () => ({
  ...jest.requireActual('./api'),
  setDynamicSettings: jest.fn(),
}));

jest.mock('../../../../utils/kibana_service', () => ({
  kibanaService: {
    coreSetup: {
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addError: jest.fn(),
        },
      },
    },
  },
}));

function getSetDynamicSettingsWorker() {
  const gen = setDynamicSettingsEffect();
  const effect = gen.next().value as ForkEffect;
  return effect.payload.args[1] as (action: Action<DynamicSettings>) => Generator;
}

const savedSettings: DynamicSettings = {
  ...DYNAMIC_SETTINGS_DEFAULTS,
  rebalancePrivateLocationShardsEnabled: true,
};

describe('setDynamicSettingsEffect', () => {
  beforeAll(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('does not refresh default alert rules when only shard rebalancing changes', () => {
    const payload: DynamicSettings = {
      ...savedSettings,
      rebalancePrivateLocationShardsEnabled: false,
    };
    const gen = getSetDynamicSettingsWorker()(setDynamicSettingsAction.get(payload));

    expect(gen.next().value).toEqual(select(selectDynamicSettings));
    expect(gen.next({ settings: savedSettings }).value).toEqual(
      call(setDynamicSettings, { settings: payload })
    );
    expect(gen.next().value).toEqual(put(setDynamicSettingsAction.success(payload)));
    expect(gen.next().done).toBe(true);
  });

  it('does not refresh default alert rules when only the sync interval changes', () => {
    const payload: DynamicSettings = {
      ...savedSettings,
      privateLocationsSyncInterval: 15,
    };
    const gen = getSetDynamicSettingsWorker()(setDynamicSettingsAction.get(payload));

    expect(gen.next().value).toEqual(select(selectDynamicSettings));
    expect(gen.next({ settings: savedSettings }).value).toEqual(
      call(setDynamicSettings, { settings: payload })
    );
    expect(gen.next().value).toEqual(put(setDynamicSettingsAction.success(payload)));
    expect(gen.next().done).toBe(true);
  });

  it('refreshes default alert rules when alerting fields change', () => {
    const payload: DynamicSettings = {
      ...savedSettings,
      certAgeThreshold: 365,
    };
    const gen = getSetDynamicSettingsWorker()(setDynamicSettingsAction.get(payload));

    expect(gen.next().value).toEqual(select(selectDynamicSettings));
    expect(gen.next({ settings: savedSettings }).value).toEqual(
      call(setDynamicSettings, { settings: payload })
    );
    expect(gen.next().value).toEqual(put(updateDefaultAlertingAction.get()));
    expect(gen.next().value).toEqual(put(setDynamicSettingsAction.success(payload)));
    expect(gen.next().done).toBe(true);
  });
});
