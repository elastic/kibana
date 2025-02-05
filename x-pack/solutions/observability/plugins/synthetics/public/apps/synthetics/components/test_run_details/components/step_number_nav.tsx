/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  stepIndex: number;
  totalSteps: number;
  handlePreviousStep: () => void;
  handleNextStep: () => void;
}

export const StepNumberNav = ({
  stepIndex,
  totalSteps,
  handleNextStep,
  handlePreviousStep,
}: Props) => {
  const hasPreviousStep = stepIndex > 1;
  const hasNextStep = stepIndex < totalSteps;

  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="syntheticsStepNumberNavButton"
              onClick={handlePreviousStep}
              disabled={!hasPreviousStep}
              iconType="arrowLeft"
              aria-label={PREVIOUS_STEP_BUTTON_ARIA_LABEL}
            >
              {PREVIOUS_STEP_BUTTON_TEXT}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.synthetics.synthetics.testDetails.stepNav"
                defaultMessage="{stepIndex} / {totalSteps}"
                values={{
                  stepIndex,
                  totalSteps,
                }}
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="syntheticsStepNumberNavButton"
              onClick={handleNextStep}
              disabled={!hasNextStep}
              iconType="arrowRight"
              iconSide="right"
              aria-label={NEXT_STEP_BUTTON_ARIA_LABEL}
            >
              {NEXT_STEP_BUTTON_TEXT}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const PREVIOUS_STEP_BUTTON_TEXT = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.previousStepButtonText',
  {
    defaultMessage: 'Previous',
  }
);

const PREVIOUS_STEP_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.previousStepButtonAriaLabel',
  {
    defaultMessage: 'Previous step',
  }
);

const NEXT_STEP_BUTTON_TEXT = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.nextStepButtonText',
  {
    defaultMessage: 'Next',
  }
);

const NEXT_STEP_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.synthetics.synthetics.stepDetail.nextStepButtonAriaLabel',
  {
    defaultMessage: 'Next step',
  }
);
