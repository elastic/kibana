/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/enterprise_search_url.mock';
import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiCode, EuiCodeBlock, EuiButtonEmpty } from '@elastic/eui';

import { ApiCodeExample, FlyoutHeader, FlyoutBody, FlyoutFooter } from './api_code_example';

describe('ApiCodeExample', () => {
  const values = {
    engineName: 'test-engine',
    engine: { apiKey: 'test-key' },
  };
  const actions = {
    closeDocumentCreation: jest.fn(),
  };

  beforeAll(() => {
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<ApiCodeExample />);
    expect(wrapper.find(FlyoutHeader)).toHaveLength(1);
    expect(wrapper.find(FlyoutBody)).toHaveLength(1);
    expect(wrapper.find(FlyoutFooter)).toHaveLength(1);
  });

  describe('FlyoutHeader', () => {
    it('renders', () => {
      const wrapper = shallow(<FlyoutHeader />);
      expect(wrapper.find('h2').text()).toEqual('Indexing by API');
    });
  });

  describe('FlyoutBody', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      wrapper = shallow(<FlyoutBody />);
    });

    it('renders with the full remote Enterprise Search API URL', () => {
      expect(wrapper.find(EuiCode).dive().text()).toEqual(
        'http://localhost:3002/api/as/v1/engines/test-engine/documents'
      );
      expect(wrapper.find(EuiCodeBlock).dive().text()).toEqual(
        expect.stringContaining('http://localhost:3002/api/as/v1/engines/test-engine/documents')
      );
    });

    it('renders with the API key', () => {
      expect(wrapper.find(EuiCodeBlock).dive().text()).toEqual(expect.stringContaining('test-key'));
    });
  });

  describe('FlyoutFooter', () => {
    it('closes the flyout', () => {
      const wrapper = shallow(<FlyoutFooter />);

      wrapper.find(EuiButtonEmpty).simulate('click');
      expect(actions.closeDocumentCreation).toHaveBeenCalled();
    });
  });
});
