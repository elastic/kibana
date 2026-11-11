/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiTitle, useEuiTheme } from '@elastic/eui';

export interface GreetingTitleProps {
  greeting: string;
  title: string;
}

/** Two-chunk page greeting on one line; wraps when the page is too narrow. */
export function GreetingTitle({ greeting, title }: GreetingTitleProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  // Same EuiTitle → heading → spans shape as AlertZero's page header; the heading
  // child is required for EuiTitle sizing. A space between chunks keeps wrap natural.
  return (
    <EuiTitle
      size="m"
      css={css`
        font-weight: ${euiTheme.font.weight.medium};
      `}
    >
      <h2>
        <span
          css={css`
            color: ${euiTheme.colors.textDisabled};
          `}
        >
          {greeting}
        </span>{' '}
        <span>{title}</span>
      </h2>
    </EuiTitle>
  );
}
