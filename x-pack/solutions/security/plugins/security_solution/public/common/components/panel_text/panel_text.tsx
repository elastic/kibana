/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { css, type CSSInterpolation } from '@emotion/css';
import { EuiText, useEuiTheme, type EuiTextProps } from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export interface PanelTextProps extends PropsWithChildren<EuiTextProps> {
  subdued?: true;
  semiBold?: true;
  cursive?: true;
}
export const PanelText = React.memo<PanelTextProps>(
  ({ children, subdued, semiBold, cursive, ...props }) => {
    const { euiTheme } = useEuiTheme();
    const isDarkMode = useKibanaIsDarkMode();

    let color;
    if (subdued && !isDarkMode) {
      color = 'subdued';
    }

    const style: CSSInterpolation = {};
    if (semiBold) {
      style.fontWeight = euiTheme.font.weight.semiBold;
    }
    if (cursive) {
      style.fontStyle = 'italic';
    }

    return (
      <EuiText {...props} color={color} className={css(style)}>
        {children}
      </EuiText>
    );
  }
);
PanelText.displayName = 'PanelText';
