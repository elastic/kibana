/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiTextTruncate, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { NODE_LABEL_HEIGHT, NODE_LABEL_WIDTH } from '../styles';

export interface LabelProps {
  text?: string;
}

export const Label = ({ text = '' }: LabelProps) => {
  const [isTruncated, setIsTruncated] = React.useState(false);
  const { euiTheme } = useEuiTheme();
  return (
    <EuiToolTip content={isTruncated ? text : ''} position="bottom">
      <EuiText size="s" textAlign="center">
        <EuiTextTruncate
          text={text}
          truncation="middle"
          truncationOffset={10}
          width={NODE_LABEL_WIDTH}
          title={undefined} // Prevent EuiTextTruncate from setting the native HTML `title` attr and render a double tooltip
          css={css`
            display: inline-flex;
            align-items: center;
            height: ${NODE_LABEL_HEIGHT}px;
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          {(truncatedText) => {
            setIsTruncated(truncatedText.length !== text.length);
            return <span>{truncatedText}</span>;
          }}
        </EuiTextTruncate>
      </EuiText>
    </EuiToolTip>
  );
};
