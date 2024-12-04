/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiSwitch } from '@elastic/eui';

import { Synchronization } from './synchronization';

describe('Synchronization', () => {
  const updateSyncEnabled = jest.fn();
  const mockvalues = { contentSource: fullContentSources[0] };

  beforeEach(() => {
    setMockActions({ updateSyncEnabled });
    setMockValues(mockvalues);
  });

  it('renders when config enabled', () => {
    const wrapper = shallow(<Synchronization />);

    expect(wrapper.find(EuiSwitch)).toHaveLength(1);
  });

  it('renders when config disabled', () => {
    setMockValues({ contentSource: { isSyncConfigEnabled: false, indexing: { enabled: true } } });
    const wrapper = shallow(<Synchronization />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('handles EuiSwitch change event', () => {
    const wrapper = shallow(<Synchronization />);
    wrapper.find(EuiSwitch).simulate('change', { target: { checked: true } });

    expect(updateSyncEnabled).toHaveBeenCalled();
  });
});
