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

  return (
    <EuiTitle
      size="m"
      css={css`
        font-weight: ${euiTheme.font.weight.medium};
      `}
    >
      <h2
        css={css`
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          column-gap: ${euiTheme.size.xs};
          row-gap: 0;
          margin: 0;
          min-width: 0;
          max-width: 100%;
          text-align: left;
        `}
      >
        <span
          css={css`
            flex-shrink: 0;
            color: ${euiTheme.colors.textDisabled};
          `}
        >
          {greeting}
        </span>
        <span
          css={css`
            flex-shrink: 0;
          `}
        >
          {title}
        </span>
      </h2>
    </EuiTitle>
  );
}
