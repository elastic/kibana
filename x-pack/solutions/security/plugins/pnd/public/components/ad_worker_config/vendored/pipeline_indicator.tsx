/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * POC SPIKE — vendored from the Security Solution Attack Discovery flyout
 * (`.../workflow_configuration/pipeline_indicator`). Strings inlined under the pnd i18n
 * namespace. In the real Option A this lives in the shared package.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface PipelineIndicatorProps {
  'data-test-subj'?: string;
}

const ALERT_RETRIEVAL_LABEL = i18n.translate('xpack.pnd.adWorkerConfig.pipeline.alertRetrieval', {
  defaultMessage: 'Alert retrieval',
});
const GENERATION_LABEL = i18n.translate('xpack.pnd.adWorkerConfig.pipeline.generation', {
  defaultMessage: 'Generation',
});
const VALIDATION_LABEL = i18n.translate('xpack.pnd.adWorkerConfig.pipeline.validation', {
  defaultMessage: 'Validation',
});

const PipelineIndicatorComponent: React.FC<PipelineIndicatorProps> = ({
  'data-test-subj': dataTestSubj = 'pipelineIndicator',
}) => (
  <EuiFlexGroup
    alignItems="center"
    gutterSize="xs"
    responsive={false}
    data-test-subj={dataTestSubj}
  >
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">{'1'}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{ALERT_RETRIEVAL_LABEL}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiIcon color="subdued" type="chevronSingleRight" aria-hidden={true} />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">{'2'}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{GENERATION_LABEL}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiIcon color="subdued" type="chevronSingleRight" aria-hidden={true} />
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="default">{'3'}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{VALIDATION_LABEL}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);

PipelineIndicatorComponent.displayName = 'PipelineIndicator';

export const PipelineIndicator = React.memo(PipelineIndicatorComponent);
