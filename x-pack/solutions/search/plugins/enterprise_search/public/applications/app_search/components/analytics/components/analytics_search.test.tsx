/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues } from '../../../../__mocks__/kea_logic';
import '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldSearch } from '@elastic/eui';

import { AnalyticsSearch } from '.';

describe('AnalyticsSearch', () => {
  const { navigateToUrl } = mockKibanaValues;
  const preventDefault = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = shallow(<AnalyticsSearch />);
  const setSearchValue = (value: string) =>
    wrapper.find(EuiFieldSearch).simulate('change', { target: { value } });

  it('renders', () => {
    expect(wrapper.find(EuiFieldSearch)).toHaveLength(1);
  });

  it('updates searchValue state on input change', () => {
    expect(wrapper.find(EuiFieldSearch).prop('value')).toEqual('');

    setSearchValue('some-query');
    expect(wrapper.find(EuiFieldSearch).prop('value')).toEqual('some-query');
  });

  it('sends the user to the query detail page on search', () => {
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(navigateToUrl).toHaveBeenCalledWith(
      '/engines/some-engine/analytics/query_detail/some-query'
    );
  });

  it('falls back to showing the "" query if searchValue is empty', () => {
    setSearchValue('');
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(navigateToUrl).toHaveBeenCalledWith(
      '/engines/some-engine/analytics/query_detail/%22%22' // "" gets encoded
    );
  });
});
