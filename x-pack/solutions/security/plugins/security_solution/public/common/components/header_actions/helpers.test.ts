/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';
import { DEFAULT_ACTION_BUTTON_WIDTH, getActionsColumnWidth, isAlert } from './helpers';

describe('isAlert', () => {
  test('it returns true when the eventType is an alert', () => {
    expect(isAlert('signal')).toBe(true);
  });

  test('it returns false when the eventType is NOT an alert', () => {
    expect(isAlert('raw')).toBe(false);
  });
});

describe('getActionsColumnWidth', () => {
  // ideally the following implementation detail wouldn't be part of these tests,
  // but without it, the test would be brittle when `euiDataGridCellPaddingM` changes:
  const expectedPadding = parseInt(euiThemeVars.euiDataGridCellPaddingM, 10) * 2;

  test('it returns the expected width', () => {
    const ACTION_BUTTON_COUNT = 5;
    const expectedContentWidth = ACTION_BUTTON_COUNT * DEFAULT_ACTION_BUTTON_WIDTH;

    expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
      expectedContentWidth + expectedPadding
    );
  });

  test('it returns the minimum width when the button count is zero', () => {
    const ACTION_BUTTON_COUNT = 0;

    expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
      DEFAULT_ACTION_BUTTON_WIDTH + expectedPadding
    );
  });

  test('it returns the minimum width when the button count is negative', () => {
    const ACTION_BUTTON_COUNT = -1;

    expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
      DEFAULT_ACTION_BUTTON_WIDTH + expectedPadding
    );
  });
});
