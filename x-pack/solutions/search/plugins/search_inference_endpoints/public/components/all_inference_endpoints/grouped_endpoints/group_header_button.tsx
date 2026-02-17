/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { GroupedInferenceEndpointsData } from '../../../types';

export interface GroupByHeaderButtonProps {
  data: GroupedInferenceEndpointsData;
}
export const GroupByHeaderButton = ({ data }: GroupByHeaderButtonProps) => {
  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      data-test-subj={`${data.groupId}-accordion-header`}
    >
      <EuiText>
        <strong>{data.groupLabel}</strong>
      </EuiText>
      <EuiBadge>
        {i18n.translate(
          'xpack.searchInferenceEndpoints.groupedEndpoints.headers.endpointsCountBadge',
          {
            defaultMessage:
              '{endpointCount} {endpointCount, plural, one {endpoint} other {endpoints}}',
            values: {
              endpointCount: data.endpoints.length,
            },
          }
        )}
      </EuiBadge>
    </EuiFlexGroup>
  );
};
