/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../doc_links', () => ({
  docLinks: {
    elasticsearchGettingStarted: 'elasticsearchGettingStarted-link',
    elasticsearchCreateIndex: 'elasticsearchCreateIndex-link',
    clientsGuide: 'elasticsearchClientsGuide-link',
  },
}));
import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiLink } from '@elastic/eui';

import { ElasticsearchResources } from '.';

describe('ElasticsearchResources', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    wrapper = shallow(<ElasticsearchResources />);
  });

  it('renders', () => {
    expect(wrapper.find('h4').text()).toEqual('Resources');

    expect(wrapper.find(EuiLink).at(0).prop('href')).toEqual('elasticsearchGettingStarted-link');
    expect(wrapper.find(EuiLink).at(0).text()).toEqual('Getting started with Elasticsearch');

    expect(wrapper.find(EuiLink).at(1).prop('href')).toEqual('elasticsearchCreateIndex-link');
    expect(wrapper.find(EuiLink).at(1).text()).toEqual('Create a new index');

    expect(wrapper.find(EuiLink).at(2).prop('href')).toEqual('elasticsearchClientsGuide-link');
    expect(wrapper.find(EuiLink).at(2).text()).toEqual('Setup a language client');

    expect(wrapper.find(EuiLink).at(3).prop('href')).toEqual(
      'https://github.com/elastic/search-ui/tree/master/packages/search-ui-elasticsearch-connector'
    );
    expect(wrapper.find(EuiLink).at(3).text()).toEqual('Search UI for Elasticsearch');
  });
});
