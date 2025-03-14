/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';
import { SERVICE_PROVIDERS, ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { EndpointModelInfo, EndpointModelInfoProps } from './endpoint_model_info';

interface ServiceProviderProps extends EndpointModelInfoProps {
  service: ServiceProviderKeys;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ service, endpointInfo }) => {
  const provider = SERVICE_PROVIDERS[service];

  return provider ? (
    <EuiFlexGroup gutterSize="xs" direction="row" alignItems="center">
      <EuiFlexItem grow={0}>
        <EuiIcon
          data-test-subj={`table-column-service-provider-${service}`}
          type={provider.icon}
          style={{ marginRight: '8px' }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              {provider.name}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EndpointModelInfo endpointInfo={endpointInfo} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <span>{service}</span>
  );
};
