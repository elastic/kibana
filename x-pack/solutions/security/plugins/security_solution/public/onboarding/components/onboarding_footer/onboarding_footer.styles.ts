/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const useFooterStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    .footerItemTitle {
      font-weight: ${euiTheme.font.weight.semiBold};
    }
    .itemPanel {
      padding: ${euiTheme.base * 0.75}px;
    }

    .itemIconWrapper {
      display: inline-block;
      padding: ${euiTheme.size.s};
      background-color: ${euiTheme.colors.backgroundLightText};
      border-radius: ${euiTheme.border.radius.small};
    }
  `;
};
