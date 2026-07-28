/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiHorizontalRule,
  EuiPanel,
  EuiSteps,
  useIsWithinMinBreakpoint,
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import type { EuiStepsProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WizardStep, VectorPath } from '../types';
import { stepsStyle } from './step_rail.styles';

interface StepConfig {
  label: string;
  description: Record<VectorPath, string>;
}

const STEPS: StepConfig[] = [
  {
    label: i18n.translate('vectordbOnboarding.wizard.steps.ingest', { defaultMessage: 'Ingest' }),
    description: {
      'generate-vectors': i18n.translate('vectordbOnboarding.wizard.steps.ingest.generate', {
        defaultMessage: 'Load your content and generate embeddings with built-in models',
      }),
      'have-vectors': i18n.translate('vectordbOnboarding.wizard.steps.ingest.have', {
        defaultMessage: 'Index pre-generated embeddings into vector-optimized storage',
      }),
    },
  },
  {
    label: i18n.translate('vectordbOnboarding.wizard.steps.search', { defaultMessage: 'Search' }),
    description: {
      'generate-vectors': i18n.translate('vectordbOnboarding.wizard.steps.search.generate', {
        defaultMessage: 'Run your first query and get ranked results',
      }),
      'have-vectors': i18n.translate('vectordbOnboarding.wizard.steps.search.have', {
        defaultMessage: 'Run your first query and get ranked results',
      }),
    },
  },
];

export interface StepRailProps {
  currentStep: 1 | 2;
  stepName: WizardStep;
  path: VectorPath;
  onNext?: () => void;
  onComplete?: () => void;
}

export const StepRail = ({ currentStep, stepName, path, onNext, onComplete }: StepRailProps) => {
  const { euiTheme } = useEuiTheme();
  const isLargeScreen = useIsWithinMinBreakpoint('m');
  const telemetryPrefix = `vectordbOnboarding-${stepName}-${path}`;
  const steps: EuiStepsProps['steps'] = useMemo(
    () =>
      STEPS.map((step, i) => {
        const stepNum = i + 1;
        const status =
          stepNum === currentStep ? 'current' : stepNum < currentStep ? 'complete' : 'incomplete';
        return {
          title: step.label,
          status,
          children: (
            <EuiText size="s" color="subdued" component="p">
              {step.description[path]}
            </EuiText>
          ),
        };
      }),
    [currentStep, path]
  );

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      paddingSize="none"
      css={{ maxWidth: isLargeScreen ? euiTheme.base * 20 : undefined }}
    >
      <EuiPanel paddingSize="m" color="transparent">
        <EuiSteps
          steps={steps}
          titleSize="xxs"
          data-test-subj="vectordbWizardSteps"
          css={stepsStyle}
        />
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiPanel paddingSize="m" color="transparent">
        {currentStep === 1 ? (
          <EuiButton
            fill
            fullWidth
            onClick={onNext}
            data-test-subj="vectordbWizardContinueToSearch"
            data-telemetry-id={`${telemetryPrefix}-continueToSearch`}
          >
            {i18n.translate('vectordbOnboarding.wizard.continueToSearch', {
              defaultMessage: 'Continue',
            })}
          </EuiButton>
        ) : (
          <EuiButton
            fill
            fullWidth
            onClick={onComplete}
            data-test-subj="vectordbWizardCompleteSetup"
            data-telemetry-id={`${telemetryPrefix}-completeSetup`}
          >
            {i18n.translate('vectordbOnboarding.wizard.completeSetup', {
              defaultMessage: 'Complete setup',
            })}
          </EuiButton>
        )}
      </EuiPanel>
    </EuiPanel>
  );
};
