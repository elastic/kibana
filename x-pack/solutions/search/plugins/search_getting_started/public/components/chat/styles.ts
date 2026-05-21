/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiFontSizeFromScale, euiLineHeightFromBaseline, type UseEuiTheme } from '@elastic/eui';
import { layoutVar } from '@kbn/core-chrome-layout-constants';

export function ChatContentSeparator({ euiTheme }: UseEuiTheme) {
  return css({
    borderRight: euiTheme.border.thin,
    [`@media (max-width: ${euiTheme.breakpoint.m}px)`]: {
      borderRight: 'none',
    },
  });
}

export function NewConversationTextArea({ euiTheme }: UseEuiTheme) {
  return css({
    cursor: 'text',
    textarea: {
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
    },
  });
}

export const NewConversationSendButton = css({
  display: 'flex',
  justifyContent: 'flex-end',
});

export const NewConversationContainer = ({ euiTheme }: UseEuiTheme) =>
  css({
    paddingRight: euiTheme.size.l,
  });

export const ChatColumnsGrid = css({ gridTemplateColumns: '4fr 2fr' });

export const ChatStretchedFlexItem = ({ euiTheme }: UseEuiTheme) =>
  css({
    alignSelf: 'stretch',
    [`@media (max-width: ${euiTheme.breakpoint.m}px)`]: {
      alignSelf: 'flex-start',
    },
  });

// Constant for animation time, used to transition state in component.
// Defined here to make it easier to ensure it stays in sync with animation duration
// used in the style without having to parse a string at runtime.
export const CONVERSATION_ANIMATION_MS = 500; // 500ms euiTheme.animation.extraSlow
export const ConversationOverlayBaseStyles = ({ euiTheme }: UseEuiTheme) => {
  return css({
    position: 'fixed',
    zIndex: euiTheme.levels.flyout,
    background: euiTheme.colors.emptyShade,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: euiTheme.border.thin,
    borderColor: euiTheme.colors.borderBaseSubdued,
    transition: ['top', 'left', 'width', 'height', 'border-radius', 'border-color']
      .map((p) => `${p} ${euiTheme.animation.extraSlow} ease`)
      .join(', '),
    willChange: 'top, left, width, height, border-radius, border-color',
  });
};

export const ConversationOverlayOpenStyle = ({ euiTheme }: UseEuiTheme) =>
  css({
    top: layoutVar('application.content.top', '0px'),
    left: `calc(var(--euiCollapsibleNavOffset, 0) + ${layoutVar(
      'application.content.left',
      '0px'
    )})`,
    width: `calc(100vw - var(--euiCollapsibleNavOffset, 0) - ${layoutVar(
      'application.content.left',
      '0px'
    )} - ${layoutVar('application.content.right', '0px')})`,
    height: `calc(${layoutVar('application.content.height', '100vh')} - ${euiTheme.size.xxl})`,
    borderRadius: 0,
    borderColor: 'transparent',
  });

export const ConversationOverlayOpeningStyle = (promptLaunchRect: DOMRect) =>
  css({
    top: `${promptLaunchRect.top}px`,
    left: `${promptLaunchRect.left}px`,
    width: `${promptLaunchRect.width}px`,
    height: `${promptLaunchRect.height}px`,
    borderRadius: 16,
  });

export const ConversationStyle =
  (isAnimatingToFull: boolean) =>
  ({ euiTheme }: UseEuiTheme) =>
    css({
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      transition: `opacity ${euiTheme.animation.extraSlow} ease`,
      opacity: isAnimatingToFull ? 1 : 0,
    });
