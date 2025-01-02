/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { externalUrl } from '../../../shared/enterprise_search_url';

import { WorkplaceSearchHeaderActions } from '.';

describe('WorkplaceSearchHeaderActions', () => {
  const ENT_SEARCH_URL = 'http://localhost:3002';

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ dataLoading: false, organization: { kibanaUIsEnabled: true } });
  });

  it('does not render without an Enterprise Search URL set', () => {
    setMockValues({ dataLoading: false, organization: {} });
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders a link to the personal dashboard', () => {
    externalUrl.enterpriseSearchUrl = ENT_SEARCH_URL;
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.find('[data-test-subj="PersonalDashboardButton"]').prop('to')).toEqual(
      '/p/sources'
    );
  });

  it('renders a link to the search application', () => {
    externalUrl.enterpriseSearchUrl = ENT_SEARCH_URL;
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.find('[data-test-subj="HeaderSearchButton"]').prop('href')).toEqual(
      'http://localhost:3002/ws/search'
    );
  });

  it('renders the dashboard and search button when not gated', () => {
    externalUrl.enterpriseSearchUrl = ENT_SEARCH_URL;
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.find('[data-test-subj="PersonalDashboardButton"]').exists()).toBe(true);
    expect(wrapper.find('[data-test-subj="HeaderSearchButton"]').exists()).toBe(true);
  });

  it('does not render the dashboard and search button on the gated form', () => {
    externalUrl.enterpriseSearchUrl = ENT_SEARCH_URL;
    setMockValues({ dataLoading: false, organization: { kibanaUIsEnabled: false } });
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.find('[data-test-subj="PersonalDashboardButton"]').exists()).toBe(false);
    expect(wrapper.find('[data-test-subj="HeaderSearchButton"]').exists()).toBe(false);
  });
});
