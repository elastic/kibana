/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CHART_TOGGLE_SHOW, CHART_TOGGLE_HIDE } from '../../../common/translations';
import { getChartsToggleMenuItem, TOGGLE_TEST_ID } from '.';

describe('getChartsToggleMenuItem', () => {
  it('offers to hide the charts when they are shown', () => {
    const item = getChartsToggleMenuItem({ shouldHideCharts: false, onToggle: jest.fn() });

    expect(item).toEqual(
      expect.objectContaining({
        label: CHART_TOGGLE_HIDE,
        iconType: 'eyeSlash',
        testId: TOGGLE_TEST_ID,
      })
    );
  });

  it('offers to show the charts when they are hidden', () => {
    const item = getChartsToggleMenuItem({ shouldHideCharts: true, onToggle: jest.fn() });

    expect(item).toEqual(expect.objectContaining({ label: CHART_TOGGLE_SHOW, iconType: 'eye' }));
  });

  it('is a top-level menu item, not an overflow one', () => {
    const item = getChartsToggleMenuItem({ shouldHideCharts: false, onToggle: jest.fn() });

    expect(item.overflow).toBeFalsy();
  });

  it('calls onToggle when run', () => {
    const onToggle = jest.fn();
    const item = getChartsToggleMenuItem({ shouldHideCharts: false, onToggle });

    item.run?.();

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
