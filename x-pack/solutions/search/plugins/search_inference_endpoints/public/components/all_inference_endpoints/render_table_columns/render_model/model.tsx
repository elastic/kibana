/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { EuiText } from '@elastic/eui';

interface ModelProps {
  endpointInfo: InferenceInferenceEndpointInfo;
}

export const Model: React.FC<ModelProps> = ({ endpointInfo }) => {
  const serviceSettings = endpointInfo.service_settings;
  const modelId =
    'model_id' in serviceSettings
      ? serviceSettings.model_id
      : 'model' in serviceSettings
      ? serviceSettings.model
      : undefined;

  if (!modelId) {
    return null;
  }

  return (
    <EuiText size="s" data-test-subj="model-cell-content">
      {modelId}
    </EuiText>
  );
};
