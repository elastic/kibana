/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { EuiText, useEuiTheme, COLOR_MODES_STANDARD, type EuiTextProps } from '@elastic/eui';

export type CardSubduedTextProps = PropsWithChildren<EuiTextProps>;
export const CardSubduedText = React.memo<CardSubduedTextProps>(({ children, ...props }) => {
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;
  return (
    <EuiText {...props} color={isDarkMode ? 'text' : 'subdued'}>
      {children}
    </EuiText>
  );
});
CardSubduedText.displayName = 'CardSubduedText';
