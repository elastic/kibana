/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiAccordion, EuiPanel, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import React from 'react';
import { RootCauseAnalysisPanel } from '../rca_panel';

export function RootCauseAnalysisCollapsiblePanel({
  title,
  content,
  color,
  isDisabled,
}: {
  title: React.ReactNode;
  content: React.ReactNode;
  color?: React.ComponentProps<typeof EuiPanel>['color'];
  isDisabled?: boolean;
}) {
  const htmlId = useGeneratedHtmlId();
  return (
    <RootCauseAnalysisPanel color={color}>
      <EuiAccordion id={`panel_${htmlId}`} buttonContent={title} isDisabled={isDisabled}>
        <EuiSpacer size="l" />
        {content}
      </EuiAccordion>
    </RootCauseAnalysisPanel>
  );
}
