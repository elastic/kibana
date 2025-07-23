/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  useEuiTheme,
  useEuiFontSize,
  type EuiThemeComputed,
  type EuiThemeFontSize,
} from '@elastic/eui';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { NODE_TAG_HEIGHT } from '../styles';

export const TextBadge = styled.div<{
  isGrouped: boolean;
  euiTheme: EuiThemeComputed;
  xxsFontSize: EuiThemeFontSize;
}>`
  display: inline-flex;
  align-items: center;

  height: ${NODE_TAG_HEIGHT}px;
  padding: ${({ euiTheme }) => `0 ${euiTheme.size.s}`};

  background-color: ${({ euiTheme }) => euiTheme.colors.backgroundBasePlain};
  border: ${({ euiTheme }) => euiTheme.border.thin};
  border-radius: ${({ euiTheme }) => euiTheme.border.radius.small};

  font-weight: ${({ euiTheme }) => euiTheme.font.weight.bold};
  text-transform: capitalize;

  ${({ xxsFontSize }) => xxsFontSize};

  ${({ isGrouped }) =>
    isGrouped
      ? `
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left-width: 0;
      `
      : ''}
`;

const Count = styled(EuiBadge, {
  shouldForwardProp: (prop) => prop !== 'isTextPresent',
})<{ isTextPresent: boolean }>`
  ${({ isTextPresent }) =>
    isTextPresent
      ? `
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      `
      : ''}
`;

export interface TagProps {
  count?: number;
  text?: string;
}

export const Tag = ({ count, text }: TagProps) => {
  const isTextPresent = !!text;
  const isGrouped = !!count && count > 0;
  const { euiTheme } = useEuiTheme();
  const xxsFontSize = useEuiFontSize('xxs');
  return (
    <div
      css={css`
        display: flex;
        justify-content: center;
        ${xxsFontSize};
      `}
      data-test-subj="tag-wrapper"
    >
      {isGrouped ? (
        <Count isTextPresent={isTextPresent} color="primary" data-test-subj="tag-count">
          {count}
        </Count>
      ) : null}
      {isTextPresent ? (
        <TextBadge
          isGrouped={isGrouped}
          data-test-subj="tag-text"
          euiTheme={euiTheme}
          xxsFontSize={xxsFontSize}
        >
          {text}
        </TextBadge>
      ) : null}
    </div>
  );
};
