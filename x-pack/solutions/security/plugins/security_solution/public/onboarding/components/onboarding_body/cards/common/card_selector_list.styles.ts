/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';

export const useCardSelectorListStyles = () => {
  const { euiTheme } = useEuiTheme();

  return css`
    .cardSelectorTitle {
      font-weight: 500;
    }
    .cardSelectorContent {
      max-height: 210px;
      overflow-y: auto;
      padding: 10px 0;
    }
    .selectedCardPanelItem {
      border: 1px solid ${euiTheme.colors.primary};
      background-color: ${euiTheme.colors.backgroundBasePrimary};
    }
  `;
};
