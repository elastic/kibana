/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiHealth } from '@elastic/eui';

import { MlModelDeploymentState } from '../../../../../../common/types/ml';
import { InferencePipeline, TrainedModelState } from '../../../../../../common/types/pipelines';

import { TrainedModelHealth } from './ml_model_health';

describe('TrainedModelHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });

  const commonModelData: InferencePipeline = {
    modelId: 'sample-bert-ner-model',
    modelState: TrainedModelState.NotDeployed,
    pipelineName: 'Sample Processor',
    pipelineReferences: [],
    types: ['pytorch'],
  };
  it('renders model downloading', () => {
    const wrapper = shallow(<TrainedModelHealth modelState={MlModelDeploymentState.Downloading} />);
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Deploying');
    expect(health.prop('color')).toEqual('warning');
  });
  it('renders model downloaded', () => {
    const wrapper = shallow(<TrainedModelHealth modelState={MlModelDeploymentState.Downloaded} />);
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Deployed');
    expect(health.prop('color')).toEqual('subdued');
  });
  it('renders model started', () => {
    const pipeline: InferencePipeline = {
      ...commonModelData,
      modelState: TrainedModelState.Started,
    };
    const { modelState, modelStateReason } = pipeline;
    const wrapper = shallow(
      <TrainedModelHealth modelState={modelState} modelStateReason={modelStateReason} />
    );
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Started');
    expect(health.prop('color')).toEqual('success');
  });
  it('renders model not deployed', () => {
    const pipeline: InferencePipeline = {
      ...commonModelData,
    };
    const { modelState, modelStateReason } = pipeline;
    const wrapper = shallow(
      <TrainedModelHealth modelState={modelState} modelStateReason={modelStateReason} />
    );
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Not started');
    expect(health.prop('color')).toEqual('danger');
  });
  it('renders model not downloaded for downloadable models', () => {
    const wrapper = shallow(
      <TrainedModelHealth modelState={MlModelDeploymentState.NotDeployed} isDownloadable />
    );
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Not deployed');
    expect(health.prop('color')).toEqual('subdued');
  });
  it('renders model stopping', () => {
    const pipeline: InferencePipeline = {
      ...commonModelData,
      modelState: TrainedModelState.Stopping,
    };
    const { modelState, modelStateReason } = pipeline;
    const wrapper = shallow(
      <TrainedModelHealth modelState={modelState} modelStateReason={modelStateReason} />
    );
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Stopping');
    expect(health.prop('color')).toEqual('warning');
  });
  it('renders model starting', () => {
    const pipeline: InferencePipeline = {
      ...commonModelData,
      modelState: TrainedModelState.Starting,
    };
    const { modelState, modelStateReason } = pipeline;
    const wrapper = shallow(
      <TrainedModelHealth modelState={modelState} modelStateReason={modelStateReason} />
    );
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Starting');
    expect(health.prop('color')).toEqual('warning');
  });
  it('renders model failed', () => {
    const pipeline: InferencePipeline = {
      ...commonModelData,
      modelState: TrainedModelState.Failed,
      modelStateReason: 'Model start boom.',
    };
    const { modelState, modelStateReason } = pipeline;
    const wrapper = shallow(
      <TrainedModelHealth modelState={modelState} modelStateReason={modelStateReason} />
    );
    const health = wrapper.find(EuiHealth);
    expect(health.prop('children')).toEqual('Deployment failed');
    expect(health.prop('color')).toEqual('danger');
  });
});
