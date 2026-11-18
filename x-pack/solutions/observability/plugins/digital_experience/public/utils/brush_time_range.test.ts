/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { onBrushTimeRange } from './brush_time_range';

describe('onBrushTimeRange', () => {
  it('selects the dragged range as ISO dates', () => {
    const onTimeRangeSelect = jest.fn();

    onBrushTimeRange(onTimeRangeSelect)({
      x: [Date.UTC(2021, 0, 18, 12), Date.UTC(2021, 0, 18, 12, 30)],
    });

    expect(onTimeRangeSelect).toHaveBeenCalledWith({
      rangeFrom: '2021-01-18T12:00:00.000Z',
      rangeTo: '2021-01-18T12:30:00.000Z',
    });
  });

  it('ignores a brush without a time range', () => {
    const onTimeRangeSelect = jest.fn();

    onBrushTimeRange(onTimeRangeSelect)({ y: [] });

    expect(onTimeRangeSelect).not.toHaveBeenCalled();
  });
});
