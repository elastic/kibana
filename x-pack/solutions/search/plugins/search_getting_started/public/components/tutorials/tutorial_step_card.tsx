/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ResolvedStep } from './tutorial_state';
import { StepCodeSection } from './step_code_section';
import { StepExplanation } from './step_explanation';

export interface TutorialStepCardProps {
  step: ResolvedStep;
  stepIndex: number;
  isCurrentStep: boolean;
  isReady: boolean;
  onExecute: () => void;
  onAdvance: () => void;
  isLastStep: boolean;
}

export const TutorialStepCard: React.FC<TutorialStepCardProps> = ({
  step,
  stepIndex,
  isCurrentStep,
  isReady,
  onExecute,
  onAdvance,
  isLastStep,
}) => {
  const { resolved, state } = step;
  const isCompleted = state.status === 'completed';
  const isFailed = state.status === 'failed';
  const showExplanation = isCompleted;
  const showAdvanceButton = isCompleted && isCurrentStep && !isLastStep;
  const showRetryButton = isFailed && isCurrentStep;

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj={`tutorialStep-${stepIndex}`}>
      <EuiMarkdownFormat textSize="m">{resolved.header}</EuiMarkdownFormat>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <EuiMarkdownFormat textSize="s">{resolved.description}</EuiMarkdownFormat>
      </EuiText>
      <EuiSpacer size="m" />

      <StepCodeSection
        apiSnippet={resolved.apiSnippet}
        status={state.status}
        response={state.response}
        error={state.error}
        isReady={isReady}
        onExecute={onExecute}
      />

      <EuiSpacer size="m" />

      <StepExplanation explanation={resolved.explanation} visible={showExplanation} />

      {(showAdvanceButton || showRetryButton) && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
            {showRetryButton && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="warning"
                  iconType="refresh"
                  onClick={onExecute}
                  data-test-subj={`tutorialStep-${stepIndex}-retry`}
                >
                  {i18n.translate('xpack.searchGettingStarted.tutorial.step.retry', {
                    defaultMessage: 'Retry',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
            {showAdvanceButton && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  iconType="arrowRight"
                  iconSide="right"
                  onClick={onAdvance}
                  data-test-subj={`tutorialStep-${stepIndex}-next`}
                >
                  {i18n.translate('xpack.searchGettingStarted.tutorial.step.next', {
                    defaultMessage: 'Next step',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
