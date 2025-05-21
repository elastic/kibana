/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiPanel,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { AssistantIcon } from '@kbn/ai-assistant-icon';

export function RootCauseAnalysisCallout({
  onClick,
  onCompleteInBackgroundClick,
  completeInBackground,
}: {
  onClick: () => void;
  onCompleteInBackgroundClick: () => void;
  completeInBackground: boolean;
}) {
  const checkboxId = useGeneratedHtmlId();

  return (
    <EuiCallOut color="primary">
      <EuiPanel color="transparent" hasShadow={false} hasBorder={false}>
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="center"
            className={css`
              max-width: 512px;
            `}
          >
            <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
              <AssistantIcon size="l" />
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate('xpack.observabilityAiAssistant.rca.calloutTitle', {
                      defaultMessage: 'AI-assisted root cause analysis',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                {i18n.translate('xpack.observabilityAiAssistant.rca.calloutText', {
                  defaultMessage: `Start an automated investigation that will analyze
              log patterns, SLOs and alerts for entities and provide an evidence-
              based root cause analysis of issues in your system.`,
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexGroup direction="column" alignItems="center" gutterSize="m">
              <EuiFlexGroup
                direction="row"
                alignItems="center"
                justifyContent="center"
                gutterSize="s"
              >
                <EuiCheckbox
                  id={checkboxId}
                  onChange={() => {
                    onCompleteInBackgroundClick();
                  }}
                  checked={completeInBackground}
                />
                <EuiFormLabel htmlFor={checkboxId}>
                  {i18n.translate(
                    'xpack.observabilityAiAssistant.rootCauseAnalysisCallout.keepAnalysisRunningInFormLabelLabel',
                    { defaultMessage: 'Keep analysis running in background' }
                  )}
                </EuiFormLabel>
              </EuiFlexGroup>
              <EuiButton
                data-test-subj="observabilityAiAssistantAppRootCauseAnalysisCalloutStartAnalysisButton"
                iconType="sparkles"
                fill
                onClick={onClick}
              >
                {i18n.translate('xpack.observabilityAiAssistant.rca.calloutText', {
                  defaultMessage: 'Start analysis',
                })}
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiCallOut>
  );
}
