/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, type PropsWithChildren } from 'react';
import { css } from '@emotion/react';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiShadow,
  useEuiShadowHover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/**
 * Inline SVG mimicking Anthropic's brand mark — a six-pointed orange
 * asterisk made of elongated petals radiating from a central point.
 *
 * Used as the model-selector icon next to "Anthropic Claude Opus 4.6"
 * so the static label visually matches what the real
 * `<ConnectorSelector>` would render for a Claude connector.
 */
const AnthropicGlyph: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = '#D97757',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/*
     * Six petals at 0°, 60°, 120°, 180°, 240°, 300° — each rendered as
     * a long thin diamond (a vertical petal rotated `${i * 60}deg`
     * around the icon center). Visually reads as an asterisk / spark.
     */}
    {[0, 60, 120, 180, 240, 300].map((angle) => (
      <path
        key={angle}
        d="M8 1 L8.9 7.1 L8 8 L7.1 7.1 Z M8 15 L8.9 8.9 L8 8 L7.1 8.9 Z"
        transform={`rotate(${angle} 8 8)`}
      />
    ))}
  </svg>
);

/*
 * The following constants + style hooks mirror exactly what Agent Builder
 * uses in
 * `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_input/conversation_input.tsx`
 * and `x-pack/platform/plugins/shared/agent_builder/public/common.styles.ts`.
 * Copied here verbatim so the visual treatment is pixel-identical without
 * the obs plugin needing to depend on agent_builder's internal contexts.
 */

const INPUT_MIN_HEIGHT = '150px';
const ROUNDED_BORDER_RADIUS_EXTRA_LARGE = '16px';

const useInputBorderStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    border: ${euiTheme.border.thin};
    border-radius: ${ROUNDED_BORDER_RADIUS_EXTRA_LARGE};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    &:focus-within[aria-disabled='false'] {
      border-color: ${euiTheme.colors.primary};
    }
  `;
};

const useInputShadowStyles = () => {
  return css`
    ${useEuiShadow('s')}
    &:hover {
      ${useEuiShadowHover('s')}
    }
    &:focus-within[aria-disabled='false'] {
      ${useEuiShadow('xl')}
      :hover {
        ${useEuiShadowHover('xl')}
      }
    }
  `;
};

const containerAriaLabel = i18n.translate('xpack.agentBuilder.conversationInput.container.label', {
  defaultMessage: 'Message input form',
});

/**
 * Outer container — 1:1 copy of Agent Builder's `InputContainer`.
 *
 * Source: `agent_builder/public/application/components/conversations/conversation_input/conversation_input.tsx`
 *
 * Wrapper width / height match Agent Builder's in-conversation textbox
 * (768×98). The 768px max-width is tighter than Agent Builder's
 * `conversationElementWidthStyles` (800px) because Agent Builder's
 * content area has its own 16px horizontal padding eating into the
 * 800px max-width, so the visible box ends up 768px wide. We bake
 * that final width directly here. Height comes from the collapsed
 * state + `rows={1}` on the editor — see the editor below.
 */
const InputContainer: React.FC<
  PropsWithChildren<{ isDisabled: boolean; isCollapsed: boolean }>
> = ({ children, isDisabled, isCollapsed }) => {
  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    max-width: 768px;
    margin: 0 auto;
    min-height: ${isCollapsed ? '0' : INPUT_MIN_HEIGHT};
    padding: ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.s} ${euiTheme.size.base};
    flex-grow: 0;
    transition: box-shadow 250ms, border-color 250ms, min-height 250ms ease-out;
    background-color: ${euiTheme.colors.backgroundBasePlain};

    ${useInputBorderStyles()}
    ${useInputShadowStyles()}

    &[aria-disabled='true'] {
      background-color: ${euiTheme.colors.backgroundBaseDisabled};
    }
  `;

  return (
    <EuiFlexGroup
      css={inputContainerStyles}
      direction="column"
      gutterSize="s"
      responsive={false}
      alignItems="stretch"
      justifyContent="center"
      data-test-subj="agentBuilderConversationInputForm"
      aria-label={containerAriaLabel}
      aria-disabled={isDisabled}
    >
      {children}
    </EuiFlexGroup>
  );
};

const enabledPlaceholder = i18n.translate(
  'xpack.observability.nightshift.input.placeholder',
  {
    defaultMessage:
      'Welcome to Nightshift, you can start by asking questions, status and giving tasks.',
  }
);

interface NightshiftInputProps {
  /**
   * Called with the trimmed prompt text when the user submits. Wire to
   * `useStartNightshiftConversation.start({ initialMessage })` so the
   * page fades out and the prompt auto-sends on the Agent Builder side.
   */
  onSubmit: (prompt: string) => void;
  /** Disable the input while the page is fading away. */
  isDisabled?: boolean;
}

/**
 * Bottom-anchored prompt input that visually + behaviorally matches Agent
 * Builder's `ConversationInput` 1:1. Uses the same `InputContainer`
 * styling (copied verbatim from
 * `agent_builder/public/application/components/conversations/conversation_input/conversation_input.tsx`),
 * the same outer `data-test-subj="agentBuilderConversationInputForm"`,
 * and the same submit button (sortUp icon, fill display, size="s",
 * `data-test-subj="agentBuilderConversationInputSubmitButton"`).
 *
 * Two intentional simplifications vs. the real component:
 *  - The editor is a plain `<textarea>` styled to look like
 *    `MessageEditor` (no border, transparent bg, no outline). The real
 *    `MessageEditor` is a ProseMirror instance with command badges,
 *    attachment support, etc. — those depend on agent_builder's
 *    `ConversationContext`/`StreamingContext` which aren't available
 *    outside the plugin.
 *  - The `ConnectorSelector` on the left of the action row is omitted —
 *    it would require the agent_builder agents service. The submit
 *    button stays where the real one sits (right side of the action
 *    row, justifyContent="spaceBetween").
 *
 * Both omissions are visual-only stand-ins: they keep the structural
 * placement Agent Builder uses so swapping in the real components is a
 * straight in-place replacement once Agent Builder exposes them.
 */
export const NightshiftInput: React.FC<NightshiftInputProps> = ({ onSubmit, isDisabled }) => {
  const isInputDisabled = Boolean(isDisabled);
  // Agent Builder collapses the input when there's an active conversation
  // (i.e. messages have been exchanged). The Nightshift page is the entry
  // point to a conversation, not the conversation itself, so we render
  // in the collapsed state from the start — matches the screenshot of the
  // "conversation already created" look (short, content-driven height).
  const shouldCollapseInput = true;

  const { euiTheme } = useEuiTheme();
  const [value, setValue] = useState('');
  const isSubmitEmpty = !value.trim();

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isInputDisabled) return;
    onSubmit(trimmed);
  }, [value, isInputDisabled, onSubmit]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const editorContainerStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
  `;

  /*
   * Editor styled to look exactly like `MessageEditor`'s ProseMirror
   * surface: borderless, transparent, no focus outline, padding-free —
   * the visible "box" is the outer `InputContainer`, not the textarea.
   *
   * Font sizing uses EUI's prose scale (16/14 = 1.1429rem and 24/14 =
   * 1.7143rem) so the placeholder text reads at the same rhythm as the
   * agent's typed content.
   */
  const editorStyles = css`
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0;
    resize: none;
    min-height: 24px;
    color: ${euiTheme.colors.text};
    font-family: ${euiTheme.font.family};
    font-size: 1.1429rem;
    line-height: 1.7143rem;
    &:focus {
      outline: none !important;
    }
    &::placeholder {
      color: ${euiTheme.colors.disabledText};
      font-size: 1.1429rem;
      line-height: 1.7143rem;
    }
  `;

  /*
   * Action row layout copied from `InputActions`:
   *   spaceBetween, with the connector on the left and the submit on
   *   the right. We render an empty left slot to preserve the layout
   *   while we can't render the real `ConnectorSelector`.
   */
  return (
    <InputContainer isDisabled={isInputDisabled} isCollapsed={shouldCollapseInput}>
      <EuiFlexItem css={editorContainerStyles}>
        <textarea
          value={value}
          placeholder={enabledPlaceholder}
          disabled={isInputDisabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={enabledPlaceholder}
          data-test-subj="agentBuilderConversationInputEditor"
          css={editorStyles}
          // Single visible row so total textbox height stays at ~98px
          // (the in-conversation Agent Builder size). The editor still
          // accepts multiline input — Shift+Enter inserts a newline and
          // the box grows naturally up to its content height.
          rows={1}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          {/*
           * Stand-in for the real `<ConnectorSelector />`. Uses the same
           * `EuiButtonEmpty` shape `InputPopoverButton` renders (text
           * color, iconSide left, flush="both"), so when agent_builder
           * exposes the real ConnectorSelector this slot drops in
           * unchanged. Static label for the prototype.
           */}
          <EuiFlexItem
            grow={false}
            css={css`
              flex-shrink: 1;
              min-width: 0;
              overflow: hidden;
            `}
          >
            <EuiButtonEmpty
              color="text"
              iconSide="left"
              flush="both"
              // Inline Anthropic asterisk — passed as a React component so
              // EuiButtonEmpty renders it in place of the default icon.
              iconType={() => <AnthropicGlyph size={14} />}
              aria-label={i18n.translate(
                'xpack.observability.nightshift.input.modelSelectorAriaLabel',
                { defaultMessage: 'Select model, Anthropic Claude Opus 4.6' }
              )}
              data-test-subj="agentBuilderConnectorSelectorButton"
              css={css`
                max-width: 100%;
                .euiButtonEmpty__text {
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
              `}
              onClick={() => {
                // Placeholder — would open the agent_builder
                // `ConnectorSelector` popover here.
              }}
            >
              {i18n.translate('xpack.observability.nightshift.input.modelLabel', {
                defaultMessage: 'Anthropic Claude Opus 4.6',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.agentBuilder.conversationInput.actionButton.submit',
                    { defaultMessage: 'Submit' }
                  )}
                  data-test-subj="agentBuilderConversationInputSubmitButton"
                  iconType="sortUp"
                  display="fill"
                  size="s"
                  disabled={isSubmitEmpty || isInputDisabled}
                  onClick={submit}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </InputContainer>
  );
};
