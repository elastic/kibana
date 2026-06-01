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

/* ----------------------------------------------------------------------- *
 * Agent chat input for the Nightshift Search homepage.
 *
 * Mirrors the obs Nightshift `NightshiftInput` 1:1 visually — same
 * `InputContainer` styling, same `<textarea>` editor, same submit
 * button on the right and connector-selector stand-in on the left.
 * Copied (not re-exported) into the searchHomepage plugin because
 * cross-solution imports from observability are forbidden by module
 * visibility rules.
 *
 * Two intentional simplifications vs. the obs version:
 *  - No attachments stream (the obs Critical page populates attachments
 *    via `nightshiftAttachments$`; that surface doesn't exist here).
 *  - No model-selector popover wiring — the Anthropic Claude label is
 *    a static stand-in for the real Agent Builder `ConnectorSelector`.
 *
 * Submitting calls `onSubmit(prompt)`; the parent is expected to wire
 * that to a hand-off into Agent Builder (`navigateToApp('agent_builder',
 * { path: '/agents/.../conversations/new', state: { initialMessage }})`).
 * ----------------------------------------------------------------------- */

const INPUT_MIN_HEIGHT = '150px';
const ROUNDED_BORDER_RADIUS_EXTRA_LARGE = '16px';

/**
 * Inline SVG mimicking Anthropic's brand mark — a six-pointed orange
 * asterisk. Used as the model-selector icon next to "Anthropic Claude
 * Opus 4.6", same as in the obs `NightshiftInput`.
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
    {[0, 60, 120, 180, 240, 300].map((angle) => (
      <path
        key={angle}
        d="M8 1 L8.9 7.1 L8 8 L7.1 7.1 Z M8 15 L8.9 8.9 L8 8 L7.1 8.9 Z"
        transform={`rotate(${angle} 8 8)`}
      />
    ))}
  </svg>
);

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

const containerAriaLabel = i18n.translate(
  'xpack.searchHomepage.nightshift.input.containerAriaLabel',
  { defaultMessage: 'Message input form' }
);

/**
 * Outer container — 1:1 copy of Agent Builder's `InputContainer`. The
 * 768px max-width matches the in-conversation Agent Builder textbox so
 * the visual jump on hand-off is zero.
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

const enabledPlaceholder = i18n.translate('xpack.searchHomepage.nightshift.input.placeholder', {
  defaultMessage:
    'Welcome to your Search workspace, you can start by asking questions or giving tasks.',
});

interface NightshiftSearchHomepageInputProps {
  /**
   * Called with the trimmed prompt text when the user submits. Wire to
   * the parent's "hand-off to Agent Builder" flow so the page fades
   * out and the prompt auto-sends on the Agent Builder side.
   */
  onSubmit: (prompt: string) => void;
  /** Disable the input while the page is fading away. */
  isDisabled?: boolean;
}

/**
 * Bottom-anchored prompt input. Visually identical to Agent Builder's
 * `ConversationInput` so the hand-off to a new conversation feels
 * continuous: the textbox sits at the same coordinate, the submit
 * button is the same shape, and the connector label/icon match.
 */
export const NightshiftSearchHomepageInput: React.FC<NightshiftSearchHomepageInputProps> = ({
  onSubmit,
  isDisabled,
}) => {
  const isInputDisabled = Boolean(isDisabled);
  // Render collapsed from the start — this surface is the entry point
  // into a conversation, not the conversation itself.
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
              iconType={() => <AnthropicGlyph size={14} />}
              aria-label={i18n.translate(
                'xpack.searchHomepage.nightshift.input.modelSelectorAriaLabel',
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
                // `ConnectorSelector` popover here once exposed.
              }}
            >
              {i18n.translate('xpack.searchHomepage.nightshift.input.modelLabel', {
                defaultMessage: 'Anthropic Claude Opus 4.6',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.searchHomepage.nightshift.input.submitAriaLabel',
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
