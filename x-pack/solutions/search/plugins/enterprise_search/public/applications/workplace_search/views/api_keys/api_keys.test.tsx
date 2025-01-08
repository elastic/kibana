/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiCopy } from '@elastic/eui';

import { DEFAULT_META } from '../../../shared/constants';
import { externalUrl } from '../../../shared/enterprise_search_url';

import { ApiKeys } from './api_keys';
import { ApiKeyFlyout } from './components/api_key_flyout';
import { ApiKeysList } from './components/api_keys_list';

describe('ApiKeys', () => {
  const fetchApiKeys = jest.fn();
  const resetApiKeys = jest.fn();
  const showApiKeysForm = jest.fn();
  const apiToken = {
    id: '1',
    name: 'test',
    key: 'foo',
  };

  const values = {
    apiKeyFormVisible: false,
    meta: DEFAULT_META,
    dataLoading: false,
    apiTokens: [apiToken],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions({
      fetchApiKeys,
      resetApiKeys,
      showApiKeysForm,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ApiKeys />);

    expect(wrapper.find(ApiKeysList)).toHaveLength(1);
  });

  it('renders EuiEmptyPrompt when no api keys present', () => {
    setMockValues({ ...values, apiTokens: [] });
    const wrapper = shallow(<ApiKeys />);

    expect(wrapper.find(ApiKeysList)).toHaveLength(0);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('fetches data on mount', () => {
    shallow(<ApiKeys />);

    expect(fetchApiKeys).toHaveBeenCalledTimes(1);
  });

  it('calls resetApiKeys on unmount', () => {
    shallow(<ApiKeys />);
    unmountHandler();

    expect(resetApiKeys).toHaveBeenCalledTimes(1);
  });

  it('renders the API endpoint and a button to copy it', () => {
    externalUrl.enterpriseSearchUrl = 'http://localhost:3002';
    const copyMock = jest.fn();
    const wrapper = shallow(<ApiKeys />);
    // We wrap children in a div so that `shallow` can render it.
    const copyEl = shallow(<div>{wrapper.find(EuiCopy).props().children(copyMock)}</div>);

    expect(copyEl.find('EuiButtonIcon').props().onClick).toEqual(copyMock);
    expect(copyEl.text().replace('<EuiButtonIcon />', '')).toEqual('http://localhost:3002');
  });

  it('will render ApiKeyFlyout if apiKeyFormVisible is true', () => {
    setMockValues({ ...values, apiKeyFormVisible: true });
    const wrapper = shallow(<ApiKeys />);

    expect(wrapper.find(ApiKeyFlyout)).toHaveLength(1);
  });

  it('will NOT render ApiKeyFlyout if apiKeyFormVisible is false', () => {
    setMockValues({ ...values, apiKeyFormVisible: false });
    const wrapper = shallow(<ApiKeys />);

    expect(wrapper.find(ApiKeyFlyout)).toHaveLength(0);
  });
});
