/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationInputShell } from '@kbn/agent-builder-plugin/public';
import { useKibana } from '../hooks/use_kibana';

const ANIM_MS = 480;

type Phase = 'closed' | 'opening' | 'open' | 'closing';

interface LauncherRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const readRect = (el: HTMLElement): LauncherRect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const titleStyles = css`
  font-weight: 400;
`;

const sendButtonRowStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const overlayBaseStyles = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => css`
  position: fixed;
  z-index: ${euiTheme.levels.flyout};
  background: ${euiTheme.colors.emptyShade};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: ${euiTheme.border.thin};
  border-color: ${euiTheme.colors.borderBaseSubdued};
  transition: top ${ANIM_MS}ms ease, left ${ANIM_MS}ms ease, width ${ANIM_MS}ms ease,
    height ${ANIM_MS}ms ease, border-radius ${ANIM_MS}ms ease, border-color ${ANIM_MS}ms ease;
  will-change: top, left, width, height;
`;

export const NewConversationPrompt: React.FC = () => {
  const {
    services: { chrome, agentBuilder },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const fontSizeMedium = useEuiFontSize('m');

  const launcherRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('closed');
  const [launcherRect, setLauncherRect] = useState<LauncherRect | null>(null);

  const isOverlayVisible = phase !== 'closed';
  const isAnimatingToFull = phase === 'open';

  // Hide chrome (sidenav + header) while the overlay is up.
  useEffect(() => {
    if (!isOverlayVisible) return;
    chrome.setIsVisible(false);
    return () => chrome.setIsVisible(true);
  }, [chrome, isOverlayVisible]);

  const expand = () => {
    if (phase !== 'closed') return;
    if (launcherRef.current) {
      setLauncherRect(readRect(launcherRef.current));
    }
    setPhase('opening');
    // Two RAFs ensure the overlay paints at the launcher rect once before transitioning.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('open'));
    });
  };

  const collapse = () => {
    if (phase !== 'open') return;
    if (launcherRef.current) {
      setLauncherRect(readRect(launcherRef.current));
    }
    setPhase('closing');
    setTimeout(() => {
      setPhase('closed');
      setLauncherRect(null);
    }, ANIM_MS);
  };

  const { EmbeddableConversation } = agentBuilder;

  const inlineContainerStyles = css`
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    /* Keep the launcher visually present so its rect can be measured */
    visibility: ${isOverlayVisible ? 'hidden' : 'visible'};
  `;

  const overlayPositionStyles = isAnimatingToFull
    ? css`
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        border-color: transparent;
      `
    : launcherRect
    ? css`
        top: ${launcherRect.top}px;
        left: ${launcherRect.left}px;
        width: ${launcherRect.width}px;
        height: ${launcherRect.height}px;
        border-radius: 16px;
      `
    : undefined;

  const textareaStyles = css`
    cursor: text;
    textarea {
      flex: 1;
      cursor: text;
      background: transparent;
      border: none;
      outline: none;
      resize: none;
      font-size: ${fontSizeMedium.fontSize};
      line-height: ${fontSizeMedium.lineHeight};
      color: ${euiTheme.colors.text};
      font-family: inherit;
      &::placeholder {
        color: ${euiTheme.colors.textDisabled};
      }
    }
  `;

  const conversationStyles = css`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    transition: opacity ${ANIM_MS}ms ease;
    opacity: ${isAnimatingToFull ? 1 : 0};
  `;

  return (
    <>
      <EuiFlexGroup
        responsive={false}
        alignItems="center"
        direction="column"
        justifyContent="center"
        gutterSize="l"
        css={inlineContainerStyles}
        data-test-subj="vectordbHomeNewConversationPrompt"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="m" css={titleStyles}>
            <h2>
              {i18n.translate('xpack.serverlessVectordb.home.newConversationPrompt.title', {
                defaultMessage: 'How can I help you?',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={inlineContainerStyles}>
          <ConversationInputShell ref={launcherRef} css={textareaStyles}>
            <textarea
              data-test-subj="vectordbHomeNewConversationInput"
              placeholder={i18n.translate(
                'xpack.serverlessVectordb.home.newConversationPrompt.placeholder',
                { defaultMessage: 'Ask the agent anything…' }
              )}
              aria-label={i18n.translate(
                'xpack.serverlessVectordb.home.newConversationPrompt.aria',
                {
                  defaultMessage: 'Open the AI agent chat',
                }
              )}
              readOnly
              rows={3}
              onFocus={expand}
              onMouseDown={(e) => {
                e.preventDefault();
                expand();
              }}
            />
            <div css={sendButtonRowStyles}>
              <EuiButtonIcon
                iconType="kqlFunction"
                display="fill"
                size="m"
                onClick={expand}
                aria-label={i18n.translate(
                  'xpack.serverlessVectordb.home.newConversationPrompt.send',
                  {
                    defaultMessage: 'Open the AI agent chat',
                  }
                )}
                data-test-subj="vectordbHomeNewConversationSend"
              />
            </div>
          </ConversationInputShell>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isOverlayVisible ? (
        <div
          css={[overlayBaseStyles, overlayPositionStyles]}
          data-test-subj="vectordbHomeNewConversationOverlay"
        >
          <div css={conversationStyles}>
            {phase === 'open' ? (
              <EmbeddableConversation
                sessionTag="vectordb-home"
                onClose={collapse}
                ariaLabelledBy="vectordb-home-embeddable-conversation"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};
