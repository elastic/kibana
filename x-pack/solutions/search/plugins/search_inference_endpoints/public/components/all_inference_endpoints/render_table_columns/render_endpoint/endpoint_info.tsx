/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
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
  <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
    {isEndpointPreconfigured(inferenceId) ? (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.PRECONFIGURED_LABEL}>
          <EuiIcon type="lock" size="m" data-test-subj="preconfigured-endpoint-icon" />
        </EuiToolTip>
      </EuiFlexItem>
    ) : null}
    <EuiFlexItem grow={false}>
      <span>
        <strong>{inferenceId}</strong>
      </span>
    </EuiFlexItem>
    {isProviderTechPreview(endpointInfo) ? (
      <EuiFlexItem grow={false}>
        <span>
          <EuiBetaBadge
            label={i18n.TECH_PREVIEW_LABEL}
            size="s"
            color="subdued"
            alignment="middle"
          />
        </span>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);
