/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';

import { AddAnalyticsCollection } from './add_analytics_collection';
import { AddAnalyticsCollectionModal } from './add_analytics_collection_modal';

describe('AddAnalyticsCollection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<AddAnalyticsCollection />);

    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(AddAnalyticsCollectionModal)).toHaveLength(0);
  });

  it('show render modal after click on button', () => {
    const wrapper = shallow(<AddAnalyticsCollection />);

    (wrapper.find(EuiButton).prop('onClick') as Function)?.();
    expect(wrapper.find(AddAnalyticsCollectionModal)).toHaveLength(1);
  });
});
