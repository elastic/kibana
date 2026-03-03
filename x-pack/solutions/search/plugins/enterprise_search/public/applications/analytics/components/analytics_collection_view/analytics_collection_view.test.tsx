/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../__mocks__/react_router';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt } from '@elastic/eui';

import type { AnalyticsCollection } from '../../../../../common/types/analytics';
import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AnalyticsCollectionIntegrateView } from './analytics_collection_integrate/analytics_collection_integrate_view';

import { AnalyticsCollectionView } from './analytics_collection_view';

const mockValues = {
  analyticsCollection: {
    events_datastream: 'analytics-events-example',
    name: 'Analytics-Collection-1',
  } as AnalyticsCollection,
};

const mockActions = {
  fetchAnalyticsCollection: jest.fn(),
  fetchAnalyticsCollectionDataViewId: jest.fn(),
  setTimeRange: jest.fn(),
};

describe('AnalyticsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParams.mockReturnValue({ name: '1' });
  });

  it('renders when analytics collection is empty on initial query', () => {
    setMockValues({
      ...mockValues,
      analyticsCollection: null,
    });
    setMockActions(mockActions);
    const wrapper = shallow(<AnalyticsCollectionView />);

    expect(mockActions.fetchAnalyticsCollection).toHaveBeenCalled();

    expect(wrapper.find(AnalyticsCollectionIntegrateView)).toHaveLength(0);
    expect(wrapper.find(EnterpriseSearchAnalyticsPageTemplate)).toHaveLength(1);
  });

  it('render deleted state for deleted analytics collection', async () => {
    setMockValues({ ...mockValues, analyticsCollection: null });
    setMockActions(mockActions);

    const wrapper = shallow(<AnalyticsCollectionView />);

    expect(wrapper?.find(EnterpriseSearchAnalyticsPageTemplate).find(EuiEmptyPrompt)).toHaveLength(
      1
    );
  });
});
