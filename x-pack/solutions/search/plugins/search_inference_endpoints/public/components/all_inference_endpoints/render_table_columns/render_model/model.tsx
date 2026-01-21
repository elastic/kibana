/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { EuiText } from '@elastic/eui';

import { getModelId } from '../../../../utils/get_model_id';

interface ModelProps {
  endpointInfo: InferenceInferenceEndpointInfo;
}

export const Model: React.FC<ModelProps> = ({ endpointInfo }) => {
  const modelId = getModelId(endpointInfo);

  if (!modelId) {
    return null;
  }

  return (
    <EuiText size="s" data-test-subj="model-cell-content">
      {modelId}
    </EuiText>
  );
};
