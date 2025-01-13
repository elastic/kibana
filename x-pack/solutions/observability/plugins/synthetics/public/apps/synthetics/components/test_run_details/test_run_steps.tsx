/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatTestDuration } from '../../utils/monitor_test_result/test_time_formats';
import { JourneyStep } from '../../../../../common/runtime_types';
import { BrowserStepsList, isStepEnd } from '../common/monitor_test_result/browser_steps_list';

export const TestRunSteps = ({
  isLoading,
  steps,
}: {
  isLoading: boolean;
  steps: JourneyStep[];
}) => {
  const totalDuration = steps
    .filter(isStepEnd)
    .reduce((acc, step) => acc + (step.synthetics?.step?.duration.us ?? 0), 0);

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xs">
            <h2>{STEPS_EXECUTED}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {TOTAL_DURATION}
          {formatTestDuration(totalDuration)}
        </EuiFlexItem>
      </EuiFlexGroup>

      <BrowserStepsList
        steps={steps}
        loading={isLoading}
        showStepNumber={true}
        compressed={false}
      />
    </EuiPanel>
  );
};

const STEPS_EXECUTED = i18n.translate('xpack.synthetics.testDetails.stepExecuted', {
  defaultMessage: 'Steps executed',
});

const TOTAL_DURATION = i18n.translate('xpack.synthetics.testDetails.totalDuration', {
  defaultMessage: 'Total duration: ',
});
