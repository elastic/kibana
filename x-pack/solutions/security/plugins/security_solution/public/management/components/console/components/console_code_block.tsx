/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const ConsoleCodeBlock = memo<{
  children: ReactNode;
  inline?: boolean;
  textColor?: EuiTextProps['color'];
  bold?: boolean;
}>(({ children, inline = false, textColor = 'default', bold = false }) => {
  const { euiTheme } = useEuiTheme();
  const codeBlockStyles = css`
    font-family: ${euiTheme.font.familyCode};
  `;
  return (
    <EuiText
      size="relative"
      color={textColor}
      className={inline ? 'eui-displayInline' : ''}
      css={codeBlockStyles}
    >
      {bold ? <strong>{children}</strong> : children}
    </EuiText>
  );
});
ConsoleCodeBlock.displayName = 'ConsoleCodeBlock';
