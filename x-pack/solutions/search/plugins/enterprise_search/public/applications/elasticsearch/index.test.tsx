/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { ElasticsearchGuide } from './components/elasticsearch_guide/elasticsearch_guide';

import { Elasticsearch } from '.';

describe('Elasticsearch', () => {
  it('renders the Elasticsearch setup guide', () => {
    setMockValues({
      errorConnectingMessage: '',
      config: { host: 'localhost' },
    });
    const wrapper = shallow(<Elasticsearch />);

    expect(wrapper.find(ElasticsearchGuide)).toHaveLength(1);
  });
});
