/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS, ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

import { GroupByOptions, type GroupedInferenceEndpointsData } from '../../../types';
import { ServiceIcon } from '../styles';

function isServiceProviderKeys(groupId: string): groupId is ServiceProviderKeys {
  return groupId in ServiceProviderKeys;
}

export interface GroupByIconProps {
  data: GroupedInferenceEndpointsData;
  groupBy: GroupByOptions;
}

export const GroupByIcon = ({ groupBy, data }: GroupByIconProps) => {
  if (groupBy !== GroupByOptions.Service) return null;
  if (!isServiceProviderKeys(data.groupId)) return null;

  const provider = SERVICE_PROVIDERS[data.groupId];
  if (!provider) return null;
  return (
    <EuiFlexItem>
      <EuiIcon
        title={i18n.translate(
          'xpack.searchInferenceEndpoints.groupedEndpoints.headers.icon.title',
          {
            defaultMessage: '{serviceName} service logo',
            values: {
              serviceName: provider.name,
            },
          }
        )}
        data-test-subj={`group-by-service-provider-icon-${data.groupId}`}
        type={provider.icon}
        css={ServiceIcon}
      />
    </EuiFlexItem>
  );
};
