/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';

import { getFillColor } from './get_fill_color';
import { DEFAULT_INDEX_COLOR } from '../constants';

describe('getFillColor', () => {
  test('it returns success when `incompatible` is zero', () => {
    const incompatible = 0;

    expect(getFillColor(incompatible)).toEqual(euiThemeVars.euiColorSuccess);
  });

  test('it returns danger when `incompatible` is greater than 0', () => {
    const incompatible = 1;

    expect(getFillColor(incompatible)).toEqual(euiThemeVars.euiColorDanger);
  });

  test('it returns the default color when `incompatible` is undefined', () => {
    const incompatible = undefined;

    expect(getFillColor(incompatible)).toEqual(DEFAULT_INDEX_COLOR);
  });
});
