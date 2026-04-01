/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer, EuiSteps, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import * as i18n from '../translations';
import type { ValidationItem } from '../types';

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

  const errorItems = useMemo(
    () => workflowValidationItems.filter((item) => item.level === 'error'),
    [workflowValidationItems]
  );

  const warningItems = useMemo(
    () => workflowValidationItems.filter((item) => item.level === 'warning'),
    [workflowValidationItems]
  );

  const listStyles = useMemo(
    () => ({
      listStyleType: 'disc' as const,
      marginTop: '8px',
      paddingLeft: '20px',
    }),
    []
  );

  return (
    <>
      {errorItems.length > 0 && (
        <>
          <EuiCallOut
            announceOnMount
            color="danger"
            data-test-subj="workflowValidationErrorsCallout"
            iconType="error"
            size="s"
            title={i18n.VALIDATION_ERRORS_TITLE}
          >
            <EuiText size="s">
              <ul style={listStyles}>
                {errorItems.map((item) => (
                  <li key={item.message}>{item.message}</li>
                ))}
              </ul>
            </EuiText>
          </EuiCallOut>

          <div>
            <EuiSpacer size="xl" />
          </div>
        </>
      )}

      {warningItems.length > 0 && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            data-test-subj="workflowValidationWarningsCallout"
            iconType="warning"
            size="s"
            title={i18n.VALIDATION_WARNINGS_TITLE}
          >
            <EuiText size="s">
              <ul style={listStyles}>
                {warningItems.map((item) => (
                  <li key={item.message}>{item.message}</li>
                ))}
              </ul>
            </EuiText>
          </EuiCallOut>

          <div>
            <EuiSpacer size="xl" />
          </div>
        </>
      )}

      <EuiSteps css={stepsContentSpacingOverride} headingElement="h3" steps={steps} titleSize="s" />
    </>
  );
};

WorkflowSettingsViewLayoutComponent.displayName = 'WorkflowSettingsViewLayout';

export const WorkflowSettingsViewLayout = React.memo(WorkflowSettingsViewLayoutComponent);
