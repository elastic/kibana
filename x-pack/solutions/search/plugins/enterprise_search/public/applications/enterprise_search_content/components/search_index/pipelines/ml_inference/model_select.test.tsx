/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSelectable, EuiText } from '@elastic/eui';

import { MlModel, MlModelDeploymentState } from '../../../../../../../common/types/ml';

import { LicenseBadge } from './license_badge';
import {
  DeployModelButton,
  ModelSelect,
  NoModelSelected,
  SelectedModel,
  StartModelButton,
} from './model_select';

const DEFAULT_VALUES = {
  addInferencePipelineModal: {
    configuration: {},
    indexName: 'my-index',
  },
  selectableModels: [
    {
      modelId: 'model_1',
    },
    {
      modelId: 'model_2',
    },
  ],
};
const DEFAULT_MODEL: MlModel = {
  modelId: 'model_1',
  type: 'ner',
  title: 'Model 1',
  description: 'Model 1 description',
  licenseType: 'elastic',
  modelDetailsPageUrl: 'https://my-model.ai',
  deploymentState: MlModelDeploymentState.NotDeployed,
  startTime: 0,
  targetAllocationCount: 0,
  nodeAllocationCount: 0,
  threadsPerAllocation: 0,
  isPlaceholder: false,
  hasStats: false,
  types: ['pytorch', 'ner'],
  inputFieldNames: ['title'],
  version: '1',
};

const MOCK_ACTIONS = {
  setInferencePipelineConfiguration: jest.fn(),
};

describe('ModelSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
    setMockActions(MOCK_ACTIONS);
  });
  it('renders model select with no options', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      selectableModels: null,
    });

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('options')).toEqual([]);
  });
  it('renders model select with options', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('options')).toEqual([
      {
        data: {
          modelId: 'model_1',
        },
        label: 'model_1',
      },
      {
        data: {
          modelId: 'model_2',
        },
        label: 'model_2',
      },
    ]);
  });
  it('selects the chosen option', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        configuration: {
          ...DEFAULT_VALUES.addInferencePipelineModal.configuration,
          modelID: 'model_2',
        },
      },
    });

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    expect(selectable.prop('options')[1].checked).toEqual('on');
  });
  it('sets model ID on selecting an item and clears config', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [
      { data: { modelId: 'model_1' } },
      { data: { modelId: 'model_2' }, checked: 'on' },
    ]);
    expect(MOCK_ACTIONS.setInferencePipelineConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        inferenceConfig: undefined,
        modelID: 'model_2',
        fieldMappings: undefined,
      })
    );
  });
  it('sets placeholder flag on selecting a placeholder item', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [
      { data: { modelId: 'model_1' } },
      { data: { modelId: 'model_2', isPlaceholder: true }, checked: 'on' },
    ]);
    expect(MOCK_ACTIONS.setInferencePipelineConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        modelID: 'model_2',
        isModelPlaceholderSelected: true,
      })
    );
  });
  it('generates pipeline name on selecting an item', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [
      { data: { modelId: 'model_1' } },
      { data: { modelId: 'model_2' }, checked: 'on' },
    ]);
    expect(MOCK_ACTIONS.setInferencePipelineConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineName: 'my-index-model_2',
      })
    );
  });
  it('does not generate pipeline name on selecting an item if it a name was supplied by the user', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        configuration: {
          ...DEFAULT_VALUES.addInferencePipelineModal.configuration,
          pipelineName: 'user-pipeline',
          isPipelineNameUserSupplied: true,
        },
      },
    });

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(EuiSelectable)).toHaveLength(1);
    const selectable = wrapper.find(EuiSelectable);
    selectable.simulate('change', [
      { data: { modelId: 'model_1' } },
      { data: { modelId: 'model_2' }, checked: 'on' },
    ]);
    expect(MOCK_ACTIONS.setInferencePipelineConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineName: 'user-pipeline',
      })
    );
  });
  it('renders selected model panel if a model is selected', () => {
    setMockValues({
      ...DEFAULT_VALUES,
      addInferencePipelineModal: {
        configuration: {
          ...DEFAULT_VALUES.addInferencePipelineModal.configuration,
          modelID: 'model_2',
        },
      },
      selectedModel: DEFAULT_MODEL,
    });

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(SelectedModel)).toHaveLength(1);
    expect(wrapper.find(NoModelSelected)).toHaveLength(0);
  });
  it('renders no model selected panel if no model is selected', () => {
    setMockValues(DEFAULT_VALUES);

    const wrapper = shallow(<ModelSelect />);
    expect(wrapper.find(SelectedModel)).toHaveLength(0);
    expect(wrapper.find(NoModelSelected)).toHaveLength(1);
  });

  describe('SelectedModel', () => {
    it('renders with license badge if present', () => {
      const wrapper = shallow(<SelectedModel {...DEFAULT_MODEL} />);
      expect(wrapper.find(LicenseBadge)).toHaveLength(1);
    });
    it('renders without license badge if not present', () => {
      const props = {
        ...DEFAULT_MODEL,
        licenseType: undefined,
      };

      const wrapper = shallow(<SelectedModel {...props} />);
      expect(wrapper.find(LicenseBadge)).toHaveLength(0);
    });
    it('renders with description if present', () => {
      const wrapper = shallow(<SelectedModel {...DEFAULT_MODEL} />);
      expect(wrapper.find(EuiText)).toHaveLength(1);
    });
    it('renders without description if not present', () => {
      const props = {
        ...DEFAULT_MODEL,
        description: undefined,
      };

      const wrapper = shallow(<SelectedModel {...props} />);
      expect(wrapper.find(EuiText)).toHaveLength(0);
    });
    it('renders deploy button for a model placeholder', () => {
      const props = {
        ...DEFAULT_MODEL,
        isPlaceholder: true,
      };

      const wrapper = shallow(<SelectedModel {...props} />);
      expect(wrapper.find(DeployModelButton)).toHaveLength(1);
    });
    it('renders start button for a downloaded model', () => {
      const props = {
        ...DEFAULT_MODEL,
        deploymentState: MlModelDeploymentState.NotDeployed,
      };

      const wrapper = shallow(<SelectedModel {...props} />);
      expect(wrapper.find(StartModelButton)).toHaveLength(1);
    });
  });
});
