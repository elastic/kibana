/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

import * as i18n from './translations';

export interface EndpointModelInfoProps {
  endpointInfo: InferenceInferenceEndpointInfo;
}

const descriptions: Record<string, string> = {
  [ServiceProviderKeys.elastic]: i18n.TOKEN_BASED_BILLING_DESCRIPTION,
  [ServiceProviderKeys.elasticsearch]: i18n.RESOURCE_BASED_BILLING_DESCRIPTION,
};

export const EndpointModelInfo: React.FC<EndpointModelInfoProps> = ({ endpointInfo }) => {
  const description = endpointInfo?.inference_id.startsWith('.')
    ? descriptions[endpointInfo?.service ?? '']
    : undefined;

  const attributes = endpointModelAtrributes(endpointInfo);

  return (
    <EuiFlexGroup gutterSize="xs" direction="column">
      {description && (
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
      )}
      {attributes && <EuiFlexItem>{attributes}</EuiFlexItem>}
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
