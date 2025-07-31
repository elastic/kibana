/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { EuiText, type EuiTextProps } from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

export type CardSubduedTextProps = PropsWithChildren<EuiTextProps>;
export const CardSubduedText = React.memo<CardSubduedTextProps>(({ children, ...props }) => {
  const isDarkMode = useKibanaIsDarkMode();
  return (
    <EuiText {...props} color={isDarkMode ? 'text' : 'subdued'}>
      {children}
    </EuiText>
  );
});
CardSubduedText.displayName = 'CardSubduedText';
