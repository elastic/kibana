/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGlobalTime } from '../../../../../../../common/containers/use_global_time';
import moment from 'moment';
import { useIntervalForHeatmap } from './pad_heatmap_interval_hooks';

jest.mock('../../../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(),
}));

describe('useIntervalForHeatmap', () => {
  const mockUseGlobalTime = useGlobalTime as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGlobalTime.mockReturnValue({
      from: 0,
      to: 0,
    });
  });

  it('returns a minimum of three hours for our bucket ranges, no matter how short the query range', () => {
    const now = moment.now().valueOf();
    mockUseGlobalTime.mockReturnValue({
      from: now,
      to: now,
    });
    const interval = useIntervalForHeatmap();
    expect(interval).toEqual(3);
  });

  it('in the case of a 30 day interval, returns buckets that are 24 hours in length, as we want to compute 30 buckets', () => {
    const now = moment.now().valueOf();
    const thirtyDaysAgo = moment().subtract(30, 'days').valueOf();
    mockUseGlobalTime.mockReturnValue({
      from: thirtyDaysAgo,
      to: now,
    });
    const interval = useIntervalForHeatmap();
    expect(interval).toEqual(24);
  });

  it('in the case of a 90 day interval, returns buckets that are 24 hours in length, as we still want to compute 30 buckets', () => {
    const now = moment.now().valueOf();
    const thirtyDaysAgo = moment().subtract(90, 'days').valueOf();
    mockUseGlobalTime.mockReturnValue({
      from: thirtyDaysAgo,
      to: now,
    });
    const interval = useIntervalForHeatmap();
    expect(interval).toEqual(72);
  });
});
