/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiToolTip } from '@elastic/eui';

/**
 * Applies CSS styling to enable text to be truncated with an ellipsis.
 * Example: "Don't leave me hanging..."
 *
 * Note: Requires a parent container with a defined width or max-width.
 */

export const EllipsisText = styled.span`
  &,
  & * {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: top;
    white-space: nowrap;
  }
`;
EllipsisText.displayName = 'EllipsisText';

interface Props {
  tooltipContent?: React.ReactNode;
  children: React.ReactNode;
  dataTestSubj?: string;
}

export function TruncatableText({ tooltipContent, children, dataTestSubj, ...props }: Props) {
  if (!tooltipContent)
    return (
      <EllipsisText data-test-subj={dataTestSubj} {...props}>
        {children}
      </EllipsisText>
    );

  return (
    <EuiToolTip display="block" content={tooltipContent}>
      <EllipsisText data-test-subj={dataTestSubj} {...props}>
        {children}
      </EllipsisText>
    </EuiToolTip>
  );
}
