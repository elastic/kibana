/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { InferencePipeline, TrainedModelState } from '../../../../../../common/types/pipelines';

import { DeleteInferencePipelineButton } from './delete_inference_pipeline_button';

export const DEFAULT_VALUES: InferencePipeline = {
  modelId: 'sample-bert-ner-model',
  modelState: TrainedModelState.Started,
  pipelineName: 'Sample Processor',
  pipelineReferences: ['index@ml-inference'],
  types: ['pytorch', 'ner'],
};

describe('DeleteInferencePipelineButton', () => {
  const onClickHandler = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders button with defaults', () => {
    const wrapper = shallow(
      <DeleteInferencePipelineButton onClick={onClickHandler} pipeline={DEFAULT_VALUES} />
    );
    const tooltip = wrapper.find(EuiToolTip);
    expect(tooltip).toHaveLength(0);

    const btn = wrapper.find(EuiButtonEmpty);
    expect(btn).toHaveLength(1);
    expect(btn.prop('iconType')).toBe('trash');
    expect(btn.prop('color')).toBe('text');
    expect(btn.prop('children')).toBe('Delete pipeline');
  });
  it('renders disabled with tooltip with multiple references', () => {
    const wrapper = shallow(
      <DeleteInferencePipelineButton
        onClick={onClickHandler}
        pipeline={{
          ...DEFAULT_VALUES,
          pipelineReferences: ['index@ml-inference', 'other-index@ml-inference'],
        }}
      />
    );
    const tooltip = wrapper.find(EuiToolTip);
    expect(tooltip).toHaveLength(1);

    const btn = wrapper.find(EuiButtonEmpty);
    expect(btn).toHaveLength(1);
    expect(btn.prop('disabled')).toBe(true);
  });
});
