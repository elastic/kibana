/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

jest.mock('../../../hooks/use_overview_trends_requests', () => ({
  useOverviewTrendsRequests: jest.fn(),
}));

import { useOverviewTrendsRequests } from '../../../hooks/use_overview_trends_requests';
import { GroupGridItem } from './grid_group_item';
import type { OverviewStatusMetaData } from '../../types';
import { WrappedHelper } from '../../../../../utils/testing';

describe('GridGroupItem', () => {
  const renderComponent = (props: Partial<React.ComponentProps<typeof GroupGridItem>> = {}) => {
    const defaultProps: React.ComponentProps<typeof GroupGridItem> = {
      loaded: false,
      groupLabel: 'Test Group',
      fullScreenGroup: '',
      setFullScreenGroup: () => {},
      groupMonitors: [],
      setFlyoutConfigCallback: () => {},
      view: 'cardView',
    };
    return render(
      <WrappedHelper>
        <GroupGridItem {...defaultProps} {...props} />
      </WrappedHelper>
    );
  };
  it('calls useOverviewTrendsRequests to fetch trends for visible monitors', () => {
    const monitors = [
      { configId: 'id1', locationId: 'loc1', schedule: 10 },
      { configId: 'id2', locationId: 'loc2', schedule: 10 },
    ] as unknown as OverviewStatusMetaData[];

    renderComponent({ groupMonitors: monitors, loaded: true });
    expect(useOverviewTrendsRequests).toHaveBeenCalledWith(expect.arrayContaining(monitors));
  });
});
