/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import React from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { isEndpointPreconfigured } from '../../../../utils/preconfigured_endpoint_helper';
import * as i18n from './translations';
import { isProviderTechPreview } from '../../../../utils/reranker_helper';

export interface EndpointInfoProps {
  inferenceId: string;
  endpointInfo: InferenceInferenceEndpointInfo;
  isCloudEnabled?: boolean;
}

export const EndpointInfo: React.FC<EndpointInfoProps> = ({
  inferenceId,
  endpointInfo,
  isCloudEnabled,
}) => (
  <EuiFlexGroup gutterSize="xs" direction="column" alignItems="flexStart">
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        {isEndpointPreconfigured(inferenceId) ? (
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.PRECONFIGURED_LABEL}
              type="lock"
              size="m"
              data-test-subj="preconfigured-endpoint-icon"
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <span>
            <strong>{inferenceId}</strong>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        {endpointInfo.task_type ? (
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              data-test-subj={`table-column-task-type-${endpointInfo.task_type}`}
              label={endpointInfo.task_type}
              size="s"
              color="subdued"
            />
          </EuiFlexItem>
        ) : null}
        {isProviderTechPreview(endpointInfo) ? (
          <EuiFlexItem grow={false}>
            <EuiBetaBadge label={i18n.TECH_PREVIEW_LABEL} size="s" color="hollow" />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
