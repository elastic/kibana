/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFillColor } from './get_fill_color';

const successColor = 'test-success-color';
const dangerColor = 'test-danger-color';
const primaryColor = 'test-primary-color';

describe('getFillColor', () => {
  test('it returns success when `incompatible` is zero', () => {
    const incompatible = 0;

    expect(getFillColor(incompatible, successColor, dangerColor, primaryColor)).toEqual(
      successColor
    );
  });

  test('it returns danger when `incompatible` is greater than 0', () => {
    const incompatible = 1;

    expect(getFillColor(incompatible, successColor, dangerColor, primaryColor)).toEqual(
      dangerColor
    );
  });

  test('it returns the default color when `incompatible` is undefined', () => {
    const incompatible = undefined;

    expect(getFillColor(incompatible, successColor, dangerColor, primaryColor)).toEqual(
      primaryColor
    );
  });
});
