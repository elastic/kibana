/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import type { DashboardViewPromptState } from '../hooks/use_dashboard_view_prompt_state';
import { useDashboardViewPromptState } from '../hooks/use_dashboard_view_prompt_state';

const StatusPromptComponent = ({
  currentState,
}: {
  currentState: DashboardViewPromptState | null;
}) => {
  const emptyPromptProps = useDashboardViewPromptState(currentState);
  return emptyPromptProps && currentState ? (
    <EuiPageTemplate data-test-subj={`dashboardViewEmpty${currentState}`}>
      <EuiPageTemplate.EmptyPrompt {...emptyPromptProps} />
    </EuiPageTemplate>
  ) : null;
};
StatusPromptComponent.displayName = 'StatusPromptComponent';
export const StatusPrompt = React.memo(StatusPromptComponent);
