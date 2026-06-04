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
  EuiSpacer,
  EuiSteps,
  useIsWithinMinBreakpoint,
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import type { EuiStepsProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WizardStep, VectorPath } from './types';

interface StepConfig {
  label: string;
  description: Record<VectorPath, string>;
}

const STEPS: StepConfig[] = [
  {
    label: i18n.translate('vectordbOnboarding.wizard.steps.ingest', { defaultMessage: 'Ingest' }),
    description: {
      'generate-vectors': i18n.translate('vectordbOnboarding.wizard.steps.ingest.generate', {
        defaultMessage: "Generate embeddings with Elastic's models",
      }),
      'have-vectors': i18n.translate('vectordbOnboarding.wizard.steps.ingest.have', {
        defaultMessage: 'Ingest your embeddings into Elasticsearch',
      }),
    },
  },
  {
    label: i18n.translate('vectordbOnboarding.wizard.steps.search', { defaultMessage: 'Search' }),
    description: {
      'generate-vectors': i18n.translate('vectordbOnboarding.wizard.steps.search.generate', {
        defaultMessage: 'Run kNN queries for similarity matching.',
      }),
      'have-vectors': i18n.translate('vectordbOnboarding.wizard.steps.search.have', {
        defaultMessage: 'Run kNN queries for similarity matching.',
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
      paddingSize="l"
      css={{ maxWidth: isLargeScreen ? euiTheme.base * 20 : undefined }}
    >
      <EuiSteps steps={steps} titleSize="xxs" data-test-subj="vectordbWizardSteps" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="l" />
      {currentStep === 1 ? (
        <EuiButton
          fill
          fullWidth
          onClick={onNext}
          data-test-subj="vectordbWizardReadyToSearch"
          data-telemetry-id={`${telemetryPrefix}-readyToSearch`}
        >
          {i18n.translate('vectordbOnboarding.wizard.readyToSearch', {
            defaultMessage: "I'm ready to search",
          })}
        </EuiButton>
      ) : (
        <EuiButton
          fill
          fullWidth
          onClick={onComplete}
          data-test-subj="vectordbWizardContinueHome"
          data-telemetry-id={`${telemetryPrefix}-continueToHome`}
        >
          {i18n.translate('vectordbOnboarding.wizard.continueToHome', {
            defaultMessage: 'Continue to home',
          })}
        </EuiButton>
      )}
    </EuiPanel>
  );
};
