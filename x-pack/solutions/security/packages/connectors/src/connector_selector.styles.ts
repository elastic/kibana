/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useConnectorSelectorStyles = (mode: 'combobox' | 'default') => {
  const { euiTheme } = useEuiTheme();

  if (mode === 'combobox') {
    return;
  }

  return {
    placeholder: css`
      color: ${euiTheme.colors.primary};
      margin-right: ${euiTheme.size.xs};
    `,
    optionDisplay: css`
      margin-right: 8px;
      overflow: hidden;
      text-overflow: ellipsis;
    `,
    offset: css`
      width: 24px;
    `,
    inputContainer: css`
      .euiSuperSelectControl {
        border: none;
        box-shadow: none;
        background: none;
        padding-left: 0;
      }

      .euiFormControlLayoutIcons {
        right: 14px;
        top: 2px;
      }
    `,
  };
};
