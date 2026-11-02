/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSteps, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import type { ValidationItem } from '../types';
import { WorkflowValidationCallouts } from '../workflow_validation_callouts';

type StepConfig = React.ComponentProps<typeof EuiSteps>['steps'][number];

export interface WorkflowSettingsViewLayoutProps {
  steps: StepConfig[];
  workflowValidationItems: readonly ValidationItem[];
}

const WorkflowSettingsViewLayoutComponent: React.FC<WorkflowSettingsViewLayoutProps> = ({
  steps,
  workflowValidationItems,
}) => {
  const { euiTheme } = useEuiTheme();

  const stepsContentSpacingOverride = useMemo(
    () => css`
      margin-block-start: -${euiTheme.size.m};

      .euiStep__content {
        margin-block-start: 0;
        padding-block-start: ${euiTheme.size.xs};
        padding-block-end: ${euiTheme.size.l};
      }
    `,
    [euiTheme.size.l, euiTheme.size.m, euiTheme.size.xs]
  );

  return (
    <>
      <WorkflowValidationCallouts workflowValidationItems={workflowValidationItems} />

      <EuiSteps css={stepsContentSpacingOverride} headingElement="h3" steps={steps} titleSize="s" />
    </>
  );
};

WorkflowSettingsViewLayoutComponent.displayName = 'WorkflowSettingsViewLayout';

export const WorkflowSettingsViewLayout = React.memo(WorkflowSettingsViewLayoutComponent);
