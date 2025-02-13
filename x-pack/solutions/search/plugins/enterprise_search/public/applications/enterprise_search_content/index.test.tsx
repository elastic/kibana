/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { setMockValues } from '../__mocks__/kea_logic';
import '../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { SearchIndicesRouter } from './components/search_indices';

import { EnterpriseSearchContent, EnterpriseSearchContentConfigured } from '.';

describe('EnterpriseSearchContent', () => {
  it('renders EnterpriseSearchContentConfigured', () => {
    setMockValues({
      config: { host: 'some.url' },
      errorConnectingMessage: '',
    });
    const wrapper = shallow(<EnterpriseSearchContent />);

    expect(wrapper.find(EnterpriseSearchContentConfigured)).toHaveLength(1);
  });
});

describe('EnterpriseSearchContentConfigured', () => {
  const wrapper = shallow(<EnterpriseSearchContentConfigured {...DEFAULT_INITIAL_APP_DATA} />);

  it('renders engine routes', () => {
    expect(wrapper.find(SearchIndicesRouter)).toHaveLength(1);
  });
});
