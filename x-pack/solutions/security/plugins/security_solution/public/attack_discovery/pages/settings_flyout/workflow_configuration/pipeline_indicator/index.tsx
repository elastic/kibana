/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import * as i18n from '../translations';

export interface PipelineIndicatorProps {
  'data-test-subj'?: string;
  alertRetrievalHasError?: boolean;
  validationHasError?: boolean;
}

const PipelineIndicatorComponent: React.FC<PipelineIndicatorProps> = ({
  'data-test-subj': dataTestSubj = 'pipelineIndicator',
  alertRetrievalHasError = false,
  validationHasError = false,
}) => {
  const alertRetrievalBadgeColor = alertRetrievalHasError ? 'danger' : 'default';
  const validationBadgeColor = validationHasError ? 'danger' : 'default';

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={alertRetrievalBadgeColor}
              data-test-subj="pipelineIndicatorAlertRetrievalBadge"
            >
              {'1'}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{i18n.PIPELINE_STAGE_ALERT_RETRIEVAL_LABEL}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <span data-test-subj="pipelineIndicatorArrow">
          <EuiIcon color="subdued" type="arrowRight" aria-hidden={true} />
        </span>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="default" data-test-subj="pipelineIndicatorGenerationBadge">
              {'2'}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{i18n.PIPELINE_STAGE_GENERATION_LABEL}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <span data-test-subj="pipelineIndicatorArrow">
          <EuiIcon color="subdued" type="arrowRight" aria-hidden={true} />
        </span>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={validationBadgeColor}
              data-test-subj="pipelineIndicatorValidationBadge"
            >
              {'3'}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{i18n.PIPELINE_STAGE_VALIDATION_LABEL}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

PipelineIndicatorComponent.displayName = 'PipelineIndicator';

export const PipelineIndicator = React.memo(PipelineIndicatorComponent);
PipelineIndicator.displayName = 'PipelineIndicator';
