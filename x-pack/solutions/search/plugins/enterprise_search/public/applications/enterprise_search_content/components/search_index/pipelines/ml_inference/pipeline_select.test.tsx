/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { EuiSelectable } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import { PipelineSelect } from './pipeline_select';

const DEFAULT_VALUES = {
  addInferencePipelineModal: {
    configuration: {
      pipelineName: '',
    },
  },
  existingInferencePipelines: [],
};

const MOCK_ACTIONS = {
  selectExistingPipeline: jest.fn(),
};

const EUI_BASE_SIZE = parseFloat(euiThemeVars.euiSize);

describe('PipelineSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
    setMockActions(MOCK_ACTIONS);
  });
  it('renders pipeline select with no options', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<PipelineSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('options')).toEqual([]);
  });
  it('limits pipeline select height to option count', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      existingInferencePipelines: [
        {
          modelId: 'model_1',
          modelType: 'model_1_type',
          pipelineName: 'pipeline_1',
          sourceFields: [],
        },
        {
          modelId: 'model_2',
          modelType: 'model_2_type',
          pipelineName: 'pipeline_2',
          sourceFields: [],
        },
        {
          modelId: 'model_3',
          modelType: 'model_3_type',
          pipelineName: 'pipeline_3',
          sourceFields: [],
        },
      ],
    });

    const wrapper = mount(<PipelineSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('height')).toEqual(EUI_BASE_SIZE * 6 * 3);
    expect(selectable.prop('options')).toHaveLength(3);
  });
  it('limits pipeline select height to 4.5 options', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      existingInferencePipelines: [
        {
          modelId: 'model_1',
          modelType: 'model_1_type',
          pipelineName: 'pipeline_1',
          sourceFields: [],
        },
        {
          modelId: 'model_2',
          modelType: 'model_2_type',
          pipelineName: 'pipeline_2',
          sourceFields: [],
        },
        {
          modelId: 'model_3',
          modelType: 'model_3_type',
          pipelineName: 'pipeline_3',
          sourceFields: [],
        },
        {
          modelId: 'model_4',
          modelType: 'model_4_type',
          pipelineName: 'pipeline_4',
          sourceFields: [],
        },
        {
          modelId: 'model_5',
          modelType: 'model_5_type',
          pipelineName: 'pipeline_5',
          sourceFields: [],
        },
      ],
    });

    const wrapper = mount(<PipelineSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('height')).toEqual(EUI_BASE_SIZE * 6 * 4.5);
    expect(selectable.prop('options')).toHaveLength(5);
  });
  it('selects the chosen option', () => {
    setMockValues({
      addInferencePipelineModal: {
        configuration: {
          pipelineName: 'pipeline_3',
        },
      },
      existingInferencePipelines: [
        {
          modelId: 'model_1',
          modelType: 'model_1_type',
          pipelineName: 'pipeline_1',
        },
        {
          modelId: 'model_2',
          modelType: 'model_2_type',
          pipelineName: 'pipeline_2',
        },
        {
          modelId: 'model_3',
          modelType: 'model_3_type',
          pipelineName: 'pipeline_3',
        },
      ],
    });

    const wrapper = shallow(<PipelineSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('options')[2].checked).toEqual('on');
  });
  it('sets pipeline name on selecting a pipeline', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<PipelineSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [
      {
        label: 'pipeline_1',
        pipeline: {
          pipelineName: 'pipeline_1',
        },
      },
      {
        checked: 'on',
        label: 'pipeline_2',
        pipeline: {
          pipelineName: 'pipeline_2',
        },
      },
    ]);
    expect(MOCK_ACTIONS.selectExistingPipeline).toHaveBeenCalledWith('pipeline_2');
  });
});
