/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/react_router';
import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';
import { useLocation } from 'react-router-dom';

import { shallow } from 'enzyme';

import { Loading } from '../../../../shared/loading';

import { SourceAdded } from './source_added';

describe('SourceAdded', () => {
  const saveSourceParams = jest.fn();
  const setChromeIsVisible = jest.fn();

  beforeEach(() => {
    setMockActions({ saveSourceParams });
    setMockValues({ setChromeIsVisible });
  });

  it('renders', () => {
    const search =
      '?code=1234&state=%7B%22action%22%3A%22create%22%2C%22context%22%3A%22account%22%2C%22service_type%22%3A%22github%22%2C%22csrf_token%22%3A%22TOKEN123%3D%3D%22%2C%22index_permissions%22%3Afalse%7D';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
    const wrapper = shallow(<SourceAdded />);

    expect(wrapper.find(Loading)).toHaveLength(1);
    expect(saveSourceParams).toHaveBeenCalled();
    expect(setChromeIsVisible).toHaveBeenCalled();
  });
});
