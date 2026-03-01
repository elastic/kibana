/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import React, { useCallback, useRef, useEffect } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { TutorialDefinition } from '../../hooks/use_tutorial_content';
import { useTutorialState } from './tutorial_state';
import { TutorialStepCard } from './tutorial_step_card';
import { TutorialSummary } from './tutorial_summary';

export interface TutorialRunnerProps {
  tutorial: TutorialDefinition;
  onBack: () => void;
}

export const TutorialRunner: React.FC<TutorialRunnerProps> = ({ tutorial, onBack }) => {
  const { state, steps, executeStep, advanceStep, isStepReady, reset } = useTutorialState(
    tutorial.slug
  );

  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const setStepRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      stepRefs.current.set(index, el);
    } else {
      stepRefs.current.delete(index);
    }
  }, []);

  const prevStepRef = useRef(state.currentStep);
  useEffect(() => {
    if (state.currentStep > prevStepRef.current) {
      const el = stepRefs.current.get(state.currentStep);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevStepRef.current = state.currentStep;
  }, [state.currentStep]);

  const handleExecute = useCallback(
    (stepIndex: number) => {
      const step = steps[stepIndex];
      console.log('[Telemetry] Step executed', {
        tutorial: tutorial.slug,
        stepId: step?.source.id,
        stepIndex,
      });
      executeStep(stepIndex).catch(() => {
        // Error state is handled via stepStates; no additional action needed
      });
    },
    [executeStep, steps, tutorial.slug]
  );

  const handleAdvance = useCallback(() => {
    const currentStepDef = steps[state.currentStep];
    const isLastStep = state.currentStep === steps.length - 1;
    if (isLastStep) {
      console.log('[Telemetry] Complete tutorial clicked', {
        tutorial: tutorial.slug,
        stepId: currentStepDef?.source.id,
        stepIndex: state.currentStep,
      });
    } else {
      console.log('[Telemetry] Next step clicked', {
        tutorial: tutorial.slug,
        stepId: currentStepDef?.source.id,
        stepIndex: state.currentStep,
      });
    }
    advanceStep();
  }, [advanceStep, state.currentStep, steps, tutorial.slug]);

  const visibleSteps = steps.slice(0, state.currentStep + 1);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        css={css`
          position: sticky;
          top: var(--euiFixedHeadersOffset, 0);
          z-index: 10;
          background: var(--euiColorEmptyShade, #fff);
          padding-block: 12px;
          margin-block: -12px;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>{tutorial.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="refresh"
                color="text"
                onClick={reset}
                data-test-subj="tutorialReset"
              >
                {i18n.translate('xpack.searchGettingStarted.tutorial.runner.reset', {
                  defaultMessage: 'Reset',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="arrowLeft"
                color="text"
                onClick={onBack}
                data-test-subj="tutorialBack"
              >
                {i18n.translate('xpack.searchGettingStarted.tutorial.runner.back', {
                  defaultMessage: 'All tutorials',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {visibleSteps.map((step, i) => (
        <div key={step.source.id} ref={(el) => setStepRef(i, el)}>
          <TutorialStepCard
            step={step}
            stepIndex={i}
            isCurrentStep={i === state.currentStep}
            isReady={isStepReady(i)}
            onExecute={() => handleExecute(i)}
            onAdvance={handleAdvance}
            isLastStep={i === steps.length - 1}
          />
        </div>
      ))}

      {state.completed && (
        <>
          <EuiSpacer size="l" />
          <TutorialSummary summary={tutorial.summary} />
        </>
      )}
    </EuiFlexGroup>
  );
};
