/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlexGroup, EuiLoadingChart } from '@elastic/eui';

import { FilterBy } from '../../../utils/get_formula_by_filter';

import { AnalyticsCollectionCard } from './analytics_collection_card';

const mockCollection = {
  event_retention_day_length: 180,
  events_datastream: 'analytics-events-example2',
  id: 'example2',
  name: 'example2',
};

const chartSelector = '[data-test-subj="enterpriseSearchAnalyticsCollectionCardChart"]';
const cardSelector = '[data-test-subj="enterpriseSearchAnalyticsCollectionCard"]';

describe('AnalyticsCollectionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loading charts', async () => {
    const wrapper = shallow(
      <AnalyticsCollectionCard
        collection={mockCollection}
        isLoading
        metric={null}
        secondaryMetric={null}
        data={[]}
        filterBy={FilterBy.Searches}
      />
    );

    expect(wrapper.find(chartSelector)).toHaveLength(0);
    expect(wrapper.find(cardSelector).prop('footer')).toEqual(
      <EuiFlexGroup alignItems="center" justifyContent="center">
        <EuiLoadingChart size="m" />
      </EuiFlexGroup>
    );
  });

  it('render', async () => {
    setMockValues({});

    const mockMetric = 999;
    const secondaryMetric = 124;
    const wrapper = shallow(
      <AnalyticsCollectionCard
        collection={mockCollection}
        isLoading={false}
        metric={mockMetric}
        secondaryMetric={secondaryMetric}
        data={[[0, 23]]}
        filterBy={FilterBy.Searches}
      />
    );

    expect(wrapper.find(cardSelector)).toHaveLength(1);
    expect(wrapper.find(chartSelector)).toHaveLength(1);
  });

  it('hide charts when data is not provided', async () => {
    setMockValues({});

    const mockMetric = 999;
    const secondaryMetric = 124;
    const wrapper = shallow(
      <AnalyticsCollectionCard
        collection={mockCollection}
        isLoading={false}
        metric={mockMetric}
        secondaryMetric={secondaryMetric}
        data={[]}
        filterBy={FilterBy.Searches}
      />
    );

    expect(wrapper.find(cardSelector)).toHaveLength(1);
    expect(wrapper.find(chartSelector)).toHaveLength(0);
  });
});
