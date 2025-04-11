/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useIntegrationCardGridTabsStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    button {
      position: relative;
    }
    button:not(:first-child)::before {
      position: absolute;
      left: 0px;
      content: ' ';
      width: 1px;
      height: 70%;
      background-color: ${euiTheme.colors.darkShade};
      top: 50%;
      transform: translateY(-50%);
    }
    button[aria-pressed='true'],
    button[aria-pressed='true'] + button {
      &::before {
        content: none;
      }
    }
    button[aria-pressed='true'] {
      text-decoration: none;
    }
  `;
};
