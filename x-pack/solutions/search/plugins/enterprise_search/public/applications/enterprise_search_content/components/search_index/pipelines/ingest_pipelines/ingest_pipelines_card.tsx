/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FetchCustomPipelineApiLogic } from '../../../../api/index/fetch_custom_pipeline_api_logic';
import { IndexViewLogic } from '../../index_view_logic';

import { PipelinesLogic } from '../pipelines_logic';

import { CustomPipelineItem } from './custom_pipeline_item';
import { DefaultPipelineItem } from './default_pipeline_item';
import { IngestPipelineFlyout } from './ingest_pipeline_flyout';

interface IngestPipelinesCardProps {
  extractionDisabled: boolean;
}

export const IngestPipelinesCard: React.FC<IngestPipelinesCardProps> = ({ extractionDisabled }) => {
  const { indexName, ingestionMethod } = useValues(IndexViewLogic);

  const { canSetPipeline, index, pipelineName, pipelineState, showPipelineSettings } =
    useValues(PipelinesLogic);
  const { closePipelineSettings, openPipelineSettings, setPipelineState, savePipeline } =
    useActions(PipelinesLogic);
  const { makeRequest: fetchCustomPipeline } = useActions(FetchCustomPipelineApiLogic);
  const { data: customPipelines } = useValues(FetchCustomPipelineApiLogic);

  const customPipeline = customPipelines ? customPipelines[`${indexName}@custom`] : undefined;

  useEffect(() => {
    fetchCustomPipeline({ indexName });
  }, [indexName]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {showPipelineSettings && (
        <IngestPipelineFlyout
          closeFlyout={closePipelineSettings}
          displayOnly={!canSetPipeline}
          extractionDisabled={extractionDisabled}
          indexName={indexName}
          ingestionMethod={ingestionMethod}
          isLoading={false}
          pipeline={{ ...pipelineState, name: pipelineName }}
          savePipeline={savePipeline}
          setPipeline={setPipelineState}
        />
      )}
      <EuiFlexItem>
        <EuiPanel color="subdued">
          <DefaultPipelineItem
            index={index}
            openPipelineSettings={openPipelineSettings}
            pipelineName={pipelineName}
            ingestionMethod={ingestionMethod}
            indexName={indexName}
            pipelineState={pipelineState}
          />
        </EuiPanel>
      </EuiFlexItem>
      {customPipeline && (
        <EuiFlexItem>
          <EuiPanel color="primary">
            <CustomPipelineItem
              indexName={indexName}
              ingestionMethod={ingestionMethod}
              pipelineSuffix="custom"
              processorsCount={customPipeline.processors?.length ?? 0}
            />
          </EuiPanel>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
