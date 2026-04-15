/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import styled from 'styled-components';
import type { EuiHealthProps } from '@elastic/eui';
import { EuiHealth, EuiToolTip } from '@elastic/eui';

const StatusTextWrapper = styled.div`
  width: 100%;
  display: inline-grid;
`;

interface HealthTruncateTextProps {
  healthColor?: EuiHealthProps['color'];
  tooltipContent?: React.ReactNode;
  dataTestSubj?: string;
}

/**
 * Allows text in EuiHealth to be properly truncated with tooltip
 * @param healthColor - color for EuiHealth component
 * @param tooltipContent - tooltip content
 */
export const HealthTruncateText: React.FC<PropsWithChildren<HealthTruncateTextProps>> = ({
  tooltipContent,
  children,
  healthColor,
  dataTestSubj,
}) => {
  const content = (
    <EuiHealth color={healthColor} data-test-subj={dataTestSubj}>
      <StatusTextWrapper tabIndex={0}>
        <span className="eui-textTruncate">{children}</span>
      </StatusTextWrapper>
    </EuiHealth>
  );
  if (!tooltipContent) {
    return content;
  }
  return <EuiToolTip content={tooltipContent}>{content}</EuiToolTip>;
};

HealthTruncateText.displayName = 'HealthTruncateText';
