/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiTextTruncate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { NODE_LABEL_HEIGHT, NODE_LABEL_WIDTH } from '../styles';

export interface LabelProps {
  text?: string;
}

export const Label = ({ text = '' }: LabelProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText size="s" textAlign="center">
      <EuiTextTruncate
        text={text}
        truncation="middle"
        truncationOffset={10}
        width={NODE_LABEL_WIDTH}
        css={css`
          display: inline-flex;
          align-items: center;
          height: ${NODE_LABEL_HEIGHT}px;
          font-weight: ${euiTheme.font.weight.bold};
        `}
      >
        {(truncatedText) => {
          return <span>{truncatedText}</span>;
        }}
      </EuiTextTruncate>
    </EuiText>
  );
};
