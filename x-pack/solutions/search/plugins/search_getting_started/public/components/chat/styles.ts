/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiFontSizeFromScale, euiLineHeightFromBaseline, type UseEuiTheme } from '@elastic/eui';

export function ChatContentSeparator({ euiTheme }: UseEuiTheme) {
  return css({
    borderRight: euiTheme.border.thin,
    [`@media (max-width: ${euiTheme.breakpoint.l}px)`]: {
      borderRight: 'none',
    },
  });
}

export function NewConversationTextArea({ euiTheme }: UseEuiTheme) {
  return css({
    flex: 1,
    cursor: 'text',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontSize: euiFontSizeFromScale('m', euiTheme),
    lineHeight: euiLineHeightFromBaseline('m', euiTheme),
    color: euiTheme.colors.textParagraph,
    fontFamily: 'inherit',
    '&::placeholder': {
      color: euiTheme.colors.textDisabled,
    },
    ':focus:focus-visible': {
      outlineStyle: 'none',
    },
  });
}

export const NewConversationSendButton = css({
  display: 'flex',
  justifyContent: 'flex-end',
});

export const PromptsContainer = ({ euiTheme }: UseEuiTheme) =>
  css({
    paddingRight: euiTheme.size.l,
    containerType: 'inline-size',
  });

export const SuggestedPromptsGrid = ({ euiTheme }: UseEuiTheme) =>
  css({
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: euiTheme.size.m,
    [`@container (max-width: ${euiTheme.breakpoint.s}px)`]: {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  });

export const SuggestedPromptText = css({
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
});

export const ChatColumnsGrid = ({ euiTheme }: UseEuiTheme) =>
  css({
    gridTemplateColumns: '4fr 2fr',
    [`@media (max-width: ${euiTheme.breakpoint.l}px)`]: {
      gridTemplateColumns: '1fr',
    },
  });

export const ChatStretchedFlexItem = ({ euiTheme }: UseEuiTheme) =>
  css({
    alignSelf: 'stretch',
    [`@media (max-width: ${euiTheme.breakpoint.l}px)`]: {
      alignSelf: 'flex-start',
    },
  });
