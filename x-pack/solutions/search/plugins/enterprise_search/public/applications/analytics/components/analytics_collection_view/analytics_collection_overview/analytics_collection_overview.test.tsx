/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';
import { FilterBy } from '../../../utils/get_formula_by_filter';

import { EnterpriseSearchAnalyticsPageTemplate } from '../../layout/page_template';

import { AnalyticsCollectionNoEventsCallout } from '../analytics_collection_no_events_callout/analytics_collection_no_events_callout';

import { AnalyticsCollectionChartWithLens } from './analytics_collection_chart';

import { AnalyticsCollectionViewMetricWithLens } from './analytics_collection_metric';
import { AnalyticsCollectionOverview } from './analytics_collection_overview';

const mockValues = {
  analyticsCollection: {
    events_datastream: 'analytics-events-example',
    name: 'Analytics-Collection-1',
  } as AnalyticsCollection,
  searchSessionId: 'session-id',
  timeRange: {
    from: 'now-90d',
    to: 'now',
  },
};

const mockActions = {
  analyticsEventsExist: jest.fn(),
  fetchAnalyticsCollection: jest.fn(),
  fetchAnalyticsCollectionDataViewId: jest.fn(),
  setTimeRange: jest.fn(),
};

describe('AnalyticsOverView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with Data', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(
      <AnalyticsCollectionOverview analyticsCollection={mockValues.analyticsCollection} />
    );
    expect(wrapper.find(AnalyticsCollectionChartWithLens)).toHaveLength(1);
  });

  it('sends correct telemetry page name for selected tab', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(
      <AnalyticsCollectionOverview analyticsCollection={mockValues.analyticsCollection} />
    );

    expect(wrapper.prop('pageViewTelemetry')).toBe('View Analytics Collection - Overview');
  });

  it('render toolbar in pageHeader rightSideItems ', async () => {
    setMockValues({ ...mockValues, dataViewId: null });
    setMockActions(mockActions);

    const wrapper = shallow(
      <AnalyticsCollectionOverview analyticsCollection={mockValues.analyticsCollection} />
    );

    expect(
      wrapper?.find(EnterpriseSearchAnalyticsPageTemplate)?.prop('pageHeader')?.rightSideItems
    ).toHaveLength(1);
  });

  it('render AnalyticsCollectionChartWithLens with collection', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(
      <AnalyticsCollectionOverview analyticsCollection={mockValues.analyticsCollection} />
    );
    expect(wrapper?.find(AnalyticsCollectionChartWithLens)).toHaveLength(1);
    expect(wrapper?.find(AnalyticsCollectionChartWithLens).props()).toEqual({
      collection: mockValues.analyticsCollection,
      id: 'analytics-collection-chart-Analytics-Collection-1',
      searchSessionId: 'session-id',
      selectedChart: 'Searches',
      setSelectedChart: expect.any(Function),
      setTimeRange: mockActions.setTimeRange,
      timeRange: {
        from: 'now-90d',
        to: 'now',
      },
    });
  });

  it('displays all filter options', () => {
    const wrapper = shallow(
      <AnalyticsCollectionOverview analyticsCollection={mockValues.analyticsCollection} />
    );
    const filterOptions = wrapper.find(AnalyticsCollectionViewMetricWithLens);
    expect(filterOptions).toHaveLength(4);
    expect(filterOptions.at(0).props().name).toEqual('Searches');
    expect(filterOptions.at(1).props().name).toEqual('No results');
    expect(filterOptions.at(2).props().name).toEqual('Click');
    expect(filterOptions.at(3).props().name).toEqual('Sessions');
  });

  it('updates the selected chart when a filter option is clicked', () => {
    const wrapper = shallow(
      <AnalyticsCollectionOverview analyticsCollection={mockValues.analyticsCollection} />
    );
    const filterOption = wrapper.find(AnalyticsCollectionViewMetricWithLens).at(1);
    filterOption.simulate('click', {});
    expect(wrapper.find(AnalyticsCollectionChartWithLens).props().selectedChart).toEqual(
      FilterBy.NoResults
    );
  });

  it('renders no events AnalyticsCollectionNoEventsCallout with collection', () => {
    const wrapper = shallow(
      <AnalyticsCollectionOverview analyticsCollection={mockValues.analyticsCollection} />
    );

    expect(wrapper.find(AnalyticsCollectionNoEventsCallout)).toHaveLength(1);
    expect(wrapper?.find(AnalyticsCollectionNoEventsCallout).props()).toEqual({
      analyticsCollection: mockValues.analyticsCollection,
    });
  });
});
