/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_CONTROLS } from '@kbn/alerts-ui-shared/src/alert_filter_controls/constants';
import { setStatusOnControlConfigs } from './set_status_on_control_configs';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import type { Writable } from '@kbn/utility-types';

const defaultControls = DEFAULT_CONTROLS as Writable<FilterControlConfig>[];

describe('setStatusOnControlConfigs()', () => {
  it('Should return a default controlConfig with status if controlConfig is undefined', () => {
    const updatedControlConfigs = defaultControls;
    updatedControlConfigs[0].selected_options = ['recovered'];

    expect(setStatusOnControlConfigs('recovered')).toEqual(updatedControlConfigs);
  });

  it('Should return empty selectedOptions if status is ALL', () => {
    const updatedControlConfigs = defaultControls;
    updatedControlConfigs[0].selected_options = [];

    expect(setStatusOnControlConfigs('all')).toEqual(updatedControlConfigs);
  });

  it('Should return controlConfig with current selectedOptions when status is not the first item in config', () => {
    const controlConfigs = [defaultControls[1], defaultControls[0]];
    const updatedControlConfigs = controlConfigs;
    updatedControlConfigs[1].selected_options = ['active'];

    expect(setStatusOnControlConfigs('active', controlConfigs)).toEqual(updatedControlConfigs);
  });
});
