/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { ELASTIC_MODEL_DEFINITIONS } from '@kbn/ml-trained-models-utils';

import * as i18n from './translations';

export interface EndpointModelInfoProps {
  endpointInfo: InferenceInferenceEndpointInfo;
}

export const EndpointModelInfo: React.FC<EndpointModelInfoProps> = ({ endpointInfo }) => {
  const serviceSettings = endpointInfo.service_settings;
  const modelId =
    'model_id' in serviceSettings
      ? serviceSettings.model_id
      : 'model' in serviceSettings
      ? serviceSettings.model
      : undefined;

  const isEligibleForMITBadge = modelId && ELASTIC_MODEL_DEFINITIONS[modelId]?.license === 'MIT';

  return (
    <EuiFlexGroup gutterSize="xs" direction="column">
      {modelId && (
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" direction="row">
            <EuiFlexItem grow={0}>
              <EuiText size="s" color="subdued">
                {modelId}
              </EuiText>
            </EuiFlexItem>
            {isEligibleForMITBadge ? (
              <EuiFlexItem grow={0}>
                <EuiBadge
                  color="hollow"
                  iconType="popout"
                  iconSide="right"
                  href={ELASTIC_MODEL_DEFINITIONS[modelId].licenseUrl ?? ''}
                  target="_blank"
                  data-test-subj={'mit-license-badge'}
                >
                  {i18n.MIT_LICENSE}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}{' '}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem>{endpointModelAtrributes(endpointInfo)}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

function endpointModelAtrributes(endpoint: InferenceInferenceEndpointInfo) {
  switch (endpoint.service) {
    case ServiceProviderKeys.hugging_face:
      return huggingFaceAttributes(endpoint);
    case ServiceProviderKeys.azureaistudio:
      return azureOpenAIStudioAttributes(endpoint);
    case ServiceProviderKeys.azureopenai:
      return azureOpenAIAttributes(endpoint);
    default:
      return null;
  }
}

function huggingFaceAttributes(endpoint: InferenceInferenceEndpointInfo) {
  const serviceSettings = endpoint.service_settings;
  const url = 'url' in serviceSettings ? serviceSettings.url : null;

  return url;
}

function azureOpenAIStudioAttributes(endpoint: InferenceInferenceEndpointInfo) {
  const serviceSettings = endpoint.service_settings;
  return 'provider' in serviceSettings ? serviceSettings?.provider : undefined;
}

function azureOpenAIAttributes(endpoint: InferenceInferenceEndpointInfo) {
  const serviceSettings = endpoint.service_settings;

  return 'resource_name' in serviceSettings ? serviceSettings.resource_name : undefined;
}
