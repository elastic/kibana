/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';
import { useLocation } from 'react-router-dom';

import { shallow } from 'enzyme';

import { ConfigureAppSearchEngine } from './configure_app_search_engine';
import { ConfigureElasticsearchEngine } from './configure_elasticsearch_engine';
import { EngineCreationSteps } from './engine_creation_logic';
import { ReviewElasticsearchEngine } from './review_elasticsearch_engine';
import { SelectEngineType } from './select_engine_type';

import { EngineCreation } from '.';

const MOCK_ACTIONS = {
  setIngestionMethod: jest.fn(),
};

describe('EngineCreation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setMockActions(MOCK_ACTIONS);
  });

  it('renders SelectEngineType when the EngineCreationSteps is SelectStep', () => {
    setMockValues({ currentEngineCreationStep: EngineCreationSteps.SelectStep });

    const wrapper = shallow(<EngineCreation />);
    expect(wrapper.find(SelectEngineType)).toHaveLength(1);
  });

  it('renders ConfigureAppSearchEngine when appropriate', () => {
    setMockValues({
      currentEngineCreationStep: EngineCreationSteps.ConfigureStep,
      engineType: 'appSearch',
    });

    const wrapper = shallow(<EngineCreation />);
    expect(wrapper.find(ConfigureAppSearchEngine)).toHaveLength(1);
  });

  it('renders ConfigureElasticsearchEngine when appropriate', () => {
    setMockValues({
      currentEngineCreationStep: EngineCreationSteps.ConfigureStep,
      engineType: 'elasticsearch',
    });

    const wrapper = shallow(<EngineCreation />);
    expect(wrapper.find(ConfigureElasticsearchEngine)).toHaveLength(1);
  });

  it('renders ReviewElasticsearchEngine when the EngineCreationSteps is ReviewStep', () => {
    setMockValues({ currentEngineCreationStep: EngineCreationSteps.ReviewStep });

    const wrapper = shallow(<EngineCreation />);
    expect(wrapper.find(ReviewElasticsearchEngine)).toHaveLength(1);
  });

  it('EngineCreationLanguageInput calls setIngestionMethod on mount', () => {
    const search = '?method=crawler';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));

    shallow(<EngineCreation />);
    expect(MOCK_ACTIONS.setIngestionMethod).toHaveBeenCalledWith('crawler');
  });
});
