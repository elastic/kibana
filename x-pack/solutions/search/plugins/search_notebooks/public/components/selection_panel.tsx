/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

export interface SelectionPanelProps {
  description: string;
  id: string;
  isSelected: boolean;
  onClick: (id: string) => void;
  title: string;
}
export const SelectionPanel = ({
  description,
  id,
  isSelected,
  title,
  onClick,
}: SelectionPanelProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiPanel
        data-test-subj={`console-embedded-notebook-select-btn-${id}`}
        data-telemdata-telemetry-id={`console-embedded-notebook-select-btn-${id}`}
        onClick={() => onClick(id)}
        color={isSelected ? 'primary' : 'subdued'}
        hasBorder
      >
        <EuiTitle size="xxs">
          <h5>
            <EuiTextColor color={euiTheme.colors.primaryText}>{title}</EuiTextColor>
          </h5>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color={isSelected ? euiTheme.colors.primaryText : 'subdued'}>
          <p>{description}</p>
        </EuiText>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
    </>
  );
};
