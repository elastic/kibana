/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiSelectable, useEuiTheme, useIsWithinMaxBreakpoint } from '@elastic/eui';

import { MLInferencePipelineOption, PipelineSelectLogic } from './pipeline_select_logic';
import { PipelineSelectOption, PipelineSelectOptionProps } from './pipeline_select_option';

export const PipelineSelect: React.FC = () => {
  const {
    addInferencePipelineModal: {
      configuration: { pipelineName },
    },
    existingInferencePipelines,
  } = useValues(PipelineSelectLogic);
  const { selectExistingPipeline } = useActions(PipelineSelectLogic);

  const { euiTheme } = useEuiTheme();
  const largeScreenRowHeight = euiTheme.base * 6;
  const smallScreenRowHeight = euiTheme.base * 8;
  const maxVisibleOptions = 4.5;
  const rowHeight: number = useIsWithinMaxBreakpoint('s')
    ? smallScreenRowHeight
    : largeScreenRowHeight;
  const [height, setHeight] = useState(maxVisibleOptions * rowHeight);

  const getPipelineOptions = (
    pipelineOptions: MLInferencePipelineOption[]
  ): PipelineSelectOptionProps[] => {
    return pipelineOptions.map((pipelineOption) => ({
      checked: pipelineOption.pipelineName === pipelineName ? 'on' : undefined,
      disabled: pipelineOption.disabled,
      label: pipelineOption.pipelineName,
      pipeline: pipelineOption,
    }));
  };

  const renderPipelineOption = (option: PipelineSelectOptionProps) => {
    return <PipelineSelectOption {...option} />;
  };

  const onChange = (options: PipelineSelectOptionProps[]) => {
    const selectedOption = options.find((option) => option.checked === 'on');
    if (selectedOption) {
      selectExistingPipeline(selectedOption.pipeline.pipelineName);
    }
  };

  return (
    <EuiSelectable
      options={getPipelineOptions(existingInferencePipelines)}
      listProps={{
        bordered: true,
        showIcons: true,
        onFocusBadge: false,
        rowHeight,
      }}
      searchProps={{
        onChange: (_, matchingOptions) => {
          setHeight(Math.min(maxVisibleOptions, matchingOptions.length) * rowHeight);
        },
      }}
      searchable
      singleSelection="always"
      onChange={onChange}
      renderOption={renderPipelineOption}
      height={height}
    >
      {(list, search) => (
        <>
          {search}
          {list}
        </>
      )}
    </EuiSelectable>
  );
};
