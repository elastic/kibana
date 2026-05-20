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
  });
}

export function NewConversationTextArea({ euiTheme }: UseEuiTheme) {
  return css`
    cursor: text;
    textarea {
      flex: 1;
      cursor: text;
      background: transparent;
      border: none;
      outline: none;
      resize: none;
      font-size: ${euiFontSizeFromScale('m', euiTheme)};
      line-height: ${euiLineHeightFromBaseline('m', euiTheme)};
      color: ${euiTheme.colors.textParagraph};
      font-family: inherit;
      &::placeholder {
        color: ${euiTheme.colors.textDisabled};
      }
    }
  `;
}

export const NewConversationSendButton = css({
  display: 'flex',
  justifyContent: 'flex-end',
});

export const NewConversationContainer = ({ euiTheme }: UseEuiTheme) =>
  css({
    paddingRight: euiTheme.size.l,
  });

export const ConversationOverlayBaseStyles = ({ euiTheme }: UseEuiTheme) => css`
  position: fixed;
  z-index: ${euiTheme.levels.flyout};
  background: ${euiTheme.colors.emptyShade};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: ${euiTheme.border.thin};
  border-color: ${euiTheme.colors.borderBaseSubdued};
  transition: top ${euiTheme.animation.extraSlow} ease, left ${euiTheme.animation.extraSlow} ease,
    width ${euiTheme.animation.extraSlow} ease, height ${euiTheme.animation.extraSlow} ease,
    border-radius ${euiTheme.animation.extraSlow} ease,
    border-color ${euiTheme.animation.extraSlow} ease;
  will-change: top, left, width, height, border-radius;
`;

export const ConversationOverlayOpenStyle = ({ euiTheme }: UseEuiTheme) => css`
  top: ${layoutVar('application.content.top', '0px')};
  left: calc(var(--euiCollapsibleNavOffset, 0) + ${layoutVar('application.content.left', '0px')});
  width: calc(
    100vw - var(--euiCollapsibleNavOffset, 0) - ${layoutVar('application.content.left', '0px')} -
      ${layoutVar('application.content.right', '0px')}
  );
  height: calc(${layoutVar('application.content.height', '100vh')} - ${euiTheme.size.xxl});
  border-radius: 0;
  border-color: transparent;
`;

export const ConversationOverlayOpeningStyle = (promptLaunchRect: DOMRect) => css`
  top: ${promptLaunchRect.top}px;
  left: ${promptLaunchRect.left}px;
  width: ${promptLaunchRect.width}px;
  height: ${promptLaunchRect.height}px;
  border-radius: 16px;
`;

export const ConversationStyle =
  (isAnimatingToFull: boolean) =>
  ({ euiTheme }: UseEuiTheme) =>
    css`
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      transition: opacity ${euiTheme.animation.extraSlow} ease;
      opacity: ${isAnimatingToFull ? 1 : 0};
    `;
