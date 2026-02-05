/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { getModelId } from '../../utils/get_model_id';
import { SERVICES_LABEL, MODELS_LABEL, ENDPOINTS_LABEL } from './endpoint_stats_translations';

interface EndpointStatsProps {
  endpoints: InferenceInferenceEndpointInfo[];
}

export const EndpointStats: React.FC<EndpointStatsProps> = ({ endpoints }) => {
  const stats = useMemo(() => {
    const services = new Set<string>();
    const models = new Set<string>();

    endpoints.forEach((endpoint) => {
      services.add(endpoint.service);
      const modelId = getModelId(endpoint);
      if (modelId) {
        models.add(modelId);
      }
    });

    return {
      servicesCount: services.size,
      modelsCount: models.size,
      endpointsCount: endpoints.length,
    };
  }, [endpoints]);

  return (
    <EuiFlexGroup gutterSize="l" alignItems="center" data-test-subj="endpointStats">
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="endpointStatsServices">
          <strong>{SERVICES_LABEL}</strong> {stats.servicesCount}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="endpointStatsModels">
          <strong>{MODELS_LABEL}</strong> {stats.modelsCount}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" data-test-subj="endpointStatsEndpoints">
          <strong>{ENDPOINTS_LABEL}</strong> {stats.endpointsCount}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
