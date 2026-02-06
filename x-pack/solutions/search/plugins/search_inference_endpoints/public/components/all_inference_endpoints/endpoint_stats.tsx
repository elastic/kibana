/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { getModelId } from '../../utils/get_model_id';
import {
  SERVICES_LABEL,
  MODELS_LABEL,
  TYPES_LABEL,
  ENDPOINTS_LABEL,
} from './endpoint_stats_translations';

interface EndpointStatsProps {
  endpoints: InferenceInferenceEndpointInfo[];
}

export const EndpointStats: React.FC<EndpointStatsProps> = ({ endpoints }) => {
  const stats = useMemo(() => {
    const services = new Set<string>();
    const models = new Set<string>();
    const types = new Set<string>();

    endpoints.forEach((endpoint) => {
      services.add(endpoint.service);
      types.add(endpoint.task_type);
      const modelId = getModelId(endpoint);
      if (modelId) {
        models.add(modelId);
      }
    });

    return {
      servicesCount: services.size,
      modelsCount: models.size,
      typesCount: types.size,
      endpointsCount: endpoints.length,
    };
  }, [endpoints]);

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      responsive={false}
      data-test-subj="endpointStats"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiTextColor color="subdued">{SERVICES_LABEL}</EuiTextColor>&nbsp;
          <strong>
            <span data-test-subj="endpointStatsServicesCount">{stats.servicesCount}</span>
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">|</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiTextColor color="subdued">{MODELS_LABEL}</EuiTextColor>&nbsp;
          <strong>
            <span data-test-subj="endpointStatsModelsCount">{stats.modelsCount}</span>
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">|</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiTextColor color="subdued">{ENDPOINTS_LABEL}</EuiTextColor>&nbsp;
          <strong>
            <span data-test-subj="endpointStatsEndpointsCount">{stats.endpointsCount}</span>
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">|</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiTextColor color="subdued">{TYPES_LABEL}</EuiTextColor>&nbsp;
          <strong>
            <span data-test-subj="endpointStatsTypesCount">{stats.typesCount}</span>
          </strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
