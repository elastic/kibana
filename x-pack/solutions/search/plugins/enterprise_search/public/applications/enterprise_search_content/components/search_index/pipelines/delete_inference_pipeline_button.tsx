/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { InferencePipeline } from '../../../../../../common/types/pipelines';

export interface DeleteInferencePipelineButtonProps {
  'data-telemetry-id'?: string;
  onClick: () => void;
  pipeline: InferencePipeline;
}

const DELETE_PIPELINE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.inferencePipelineCard.action.delete',
  {
    defaultMessage: 'Delete pipeline',
  }
);

export const DeleteInferencePipelineButton: React.FC<DeleteInferencePipelineButtonProps> = (
  props
) => {
  if (props.pipeline.pipelineReferences.length > 1) {
    const indexReferences = props.pipeline.pipelineReferences
      .map((mlPipeline) => mlPipeline.replace('@ml-inference', ''))
      .join(', ');
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate(
          'xpack.enterpriseSearch.inferencePipelineCard.action.delete.disabledDescription',
          {
            defaultMessage:
              'This inference pipeline cannot be deleted because it is used in multiple pipelines [{indexReferences}]. You must detach this pipeline from all but one ingest pipeline before it can be deleted.',
            values: {
              indexReferences,
            },
          }
        )}
      >
        <EuiButtonEmpty
          data-telemetry-id={props['data-telemetry-id']}
          size="s"
          flush="both"
          iconType="trash"
          color="text"
          disabled
        >
          {DELETE_PIPELINE_LABEL}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }
  return (
    <EuiButtonEmpty
      data-telemetry-id={props['data-telemetry-id']}
      size="s"
      flush="both"
      iconType="trash"
      color="text"
      onClick={props.onClick}
    >
      {DELETE_PIPELINE_LABEL}
    </EuiButtonEmpty>
  );
};
