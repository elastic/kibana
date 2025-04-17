/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiToolTipProps } from '@elastic/eui';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * A component that adds a tooltip to its children and adds an underline to indicate that
 * the children can be hovered for more information.
 */
export const HoverForExplanationTooltip = ({ children, ...rest }: Partial<EuiToolTipProps>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip {...rest}>
      <u
        css={css`
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: ${euiTheme.size.xs};
        `}
      >
        {children}
      </u>
    </EuiToolTip>
  );
};
