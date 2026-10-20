/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import * as i18n from '../translations';
import type { ValidationItem } from '../types';

const listStyles = {
  listStyleType: 'disc' as const,
  marginTop: '8px',
  paddingLeft: '20px',
};

export interface WorkflowValidationCalloutsProps {
  workflowValidationItems: readonly ValidationItem[];
}

const WorkflowValidationCalloutsComponent: React.FC<WorkflowValidationCalloutsProps> = ({
  workflowValidationItems,
}) => {
  const errorItems = useMemo(
    () => workflowValidationItems.filter((item) => item.level === 'error'),
    [workflowValidationItems]
  );

  const warningItems = useMemo(
    () => workflowValidationItems.filter((item) => item.level === 'warning'),
    [workflowValidationItems]
  );

  if (errorItems.length === 0 && warningItems.length === 0) {
    return null;
  }

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
    </>
  );
};

WorkflowValidationCalloutsComponent.displayName = 'WorkflowValidationCallouts';

export const WorkflowValidationCallouts = React.memo(WorkflowValidationCalloutsComponent);
