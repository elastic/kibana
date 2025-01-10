/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';

import { setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';
import { Redirect } from 'react-router-dom';

import { shallow } from 'enzyme';

import { Routes } from '@kbn/shared-ux-router';

import { Connectors } from './components/connectors';
import { Customize } from './components/customize';
import { OauthApplication } from './components/oauth_application';
import { SourceConfig } from './components/source_config';
import { SettingsRouter } from './settings_router';

describe('SettingsRouter', () => {
  const initializeSettings = jest.fn();

  beforeEach(() => {
    setMockActions({ initializeSettings });
  });

  it('renders', () => {
    const wrapper = shallow(<SettingsRouter />);

    expect(wrapper.find(Routes)).toHaveLength(1);
    expect(wrapper.find(Redirect)).toHaveLength(1);
    expect(wrapper.find(Connectors)).toHaveLength(1);
    expect(wrapper.find(Customize)).toHaveLength(1);
    expect(wrapper.find(OauthApplication)).toHaveLength(1);
    expect(wrapper.find(SourceConfig)).toHaveLength(1);
  });
});
