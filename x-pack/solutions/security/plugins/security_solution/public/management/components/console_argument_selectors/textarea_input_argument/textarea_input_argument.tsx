/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiTextArea,
  EuiText,
  htmlIdGenerator,
  EuiIcon,
  EuiTitle,
  EuiPanel,
  useEuiTheme,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import type { CommandArgumentValueSelectorProps, SupportedArguments } from '../../console/types';

interface TextareaInputArgumentState {
  isPopoverOpen: boolean;
}

export interface TextareaInputArgumentProps<
  /** List of arguments that the command supports and that the console parses by default */
  TArgs extends SupportedArguments = any,
  /** The `state` that is stored for Argument Selectors. See the full definition under the ` Command ` type */
  TSelectorArgsState extends object = any
> extends CommandArgumentValueSelectorProps<
    string,
    TextareaInputArgumentState,
    EndpointCommandDefinitionMeta,
    TArgs,
    TSelectorArgsState
  > {
  width?: string;
  /**
   * Any help content to be made avaible in the popup. If defined, a help icon will
   * be shown that allows user to open and display the help content
   */
  helpContent?: React.ReactNode;
  /** Label (`title`) given to the edit icon that is displayed in the console's input area */
  openLabel?: string;
  /** Message shown when no input has been entered by the user yet */
  noInputEnteredMessage?: string;
  /** Label to display above textarea. Defaults to the console's command Argument name */
  textareaLabel?: string;
  /** Placeholder text in the textarea */
  textareaPlaceholderLabel?: string;
  /** Help icon `title` and `aria-label` label */
  helpIconLabel?: string;
  /** Label for the close button in the popup */
  closePopupButtonLabel?: string;
}

const OPEN_INPUT = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.openInputButton',
  { defaultMessage: 'Open input area' }
);

const TEXTAREA_PLACEHOLDER_TEXT = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.textareaPlaceholderText',
  { defaultMessage: 'Enter data here' }
);

const NO_INPUT_ENTERED_MESSAGE = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.noInputEnteredMessage',
  { defaultMessage: 'No input entered' }
);

const HELP_ICON_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.helpIconLabel',
  { defaultMessage: 'Show instructions' }
);

const CLOSE_POPUP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.closePopupButtonLabel',
  { defaultMessage: 'Close' }
);

/**
 * Console argument component that displays a popup textarea for user to enter free-form data.
 */
export const TextareaInputArgument = memo<TextareaInputArgumentProps>(
  ({
    value = '',
    valueText = '',
    store: state = {
      isPopoverOpen: true,
    },
    argName,
    argIndex,
    onChange,
    command,
    openLabel = OPEN_INPUT,
    noInputEnteredMessage = NO_INPUT_ENTERED_MESSAGE,
    textareaPlaceholderLabel = TEXTAREA_PLACEHOLDER_TEXT,
    helpIconLabel = HELP_ICON_LABEL,
    closePopupButtonLabel = CLOSE_POPUP_BUTTON_LABEL,
    width,
    textareaLabel,
    helpContent,
  }) => {
    const testId = useTestIdGenerator(
      `textareaInputArgument-${command.commandDefinition.name}-${argName}-${argIndex}`
    );
    const { euiTheme } = useEuiTheme();
    const [showHelpContent, setShowHelpContent] = useState(false);

    const textAreaHtmlId = useMemo(() => {
      return htmlIdGenerator('textarea')();
    }, []);

    const textareaContainerCss = useMemo(() => {
      return css`
        --height: 15rem;

        .textarea-container {
          textarea {
            min-width: 275px;
            width: ${width ?? '20vw'};
            height: var(--height);
            box-shadow: none;
            border: ${euiTheme.border.thin};
          }
        }

        .help-container {
          width: 25rem;
          word-break: break-word;
          white-space: pre-wrap;
          height: var(--height);
        }
      `;
    }, [euiTheme.border.thin, width]);

    // Because the console supports multiple instances of the same argument, we need to ensure that
    // if the command was defined to now allow multiples, that we only render the first one.
    const shouldRender = useMemo<boolean>(() => {
      const argDefinition = command.commandDefinition.args?.[argName];
      return argDefinition?.allowMultiples || argIndex === 0;
    }, [argIndex, argName, command.commandDefinition.args]);

    const handleClosePopover = useCallback(() => {
      onChange({
        value,
        valueText: value.replace(/\r?\n/g, ' ').trim(),
        store: {
          ...state,
          isPopoverOpen: false,
        },
      });
    }, [onChange, state, value]);

    const handleOpenPopover = useCallback(() => {
      onChange({
        value,
        valueText,
        store: {
          ...state,
          isPopoverOpen: !state.isPopoverOpen,
        },
      });
    }, [onChange, state, value, valueText]);

    const handleTextAreaOnChange = useCallback<React.ChangeEventHandler<HTMLTextAreaElement>>(
      (ev) => {
        const newValue = ev.target.value || '';
        onChange({
          valueText, // We leave the display text as is until the popup is closed - to avoid UI jankiness
          value: newValue,
          store: state,
        });
      },
      [onChange, state, valueText]
    );

    const handleHelpOnClick = useCallback(() => {
      setShowHelpContent((prev) => !prev);
    }, []);

    return shouldRender ? (
      <EuiPopover
        isOpen={state.isPopoverOpen}
        anchorPosition="upCenter"
        data-test-subj={testId()}
        closePopover={handleClosePopover}
        initialFocus={`textarea.${textAreaHtmlId}`}
        panelProps={{ 'data-test-subj': testId('popoverPanel') }}
        button={
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false} className="eui-textTruncate" onClick={handleOpenPopover}>
              <div className="eui-textTruncate" data-test-subj={testId('selectionDisplay')}>
                {valueText || (
                  <EuiText color="subdued" size="xs">
                    {noInputEnteredMessage}
                  </EuiText>
                )}
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="pencil"
                size="xs"
                onClick={handleOpenPopover}
                title={openLabel}
                aria-label={openLabel}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        {state.isPopoverOpen && (
          <div css={textareaContainerCss}>
            <EuiPanel paddingSize="xs" hasShadow={false} hasBorder={false}>
              <EuiFlexGroup alignItems="center" gutterSize="none">
                <EuiFlexItem>
                  <EuiTitle size="xxxs">
                    <h5>{textareaLabel ?? argName}</h5>
                  </EuiTitle>
                </EuiFlexItem>
                {helpContent && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="help"
                      size="xs"
                      onClick={handleHelpOnClick}
                      isSelected={showHelpContent}
                      title={helpIconLabel}
                      aria-label={helpIconLabel}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPanel>
            <div>
              <EuiFlexGroup
                responsive={false}
                wrap={false}
                alignItems="flexStart"
                justifyContent="spaceEvenly"
                gutterSize="xs"
                className="eui-fullHeight"
              >
                <EuiFlexItem className="textarea-container">
                  <EuiTextArea
                    value={value}
                    placeholder={textareaPlaceholderLabel}
                    onChange={handleTextAreaOnChange}
                    className={textAreaHtmlId}
                    resize="none"
                    fullWidth
                  />
                </EuiFlexItem>
                {showHelpContent && (
                  <EuiFlexItem grow={false} className="help-container">
                    <EuiPanel
                      paddingSize="s"
                      hasShadow={false}
                      hasBorder={true}
                      className="eui-fullHeight"
                    >
                      <EuiText size="s" className="eui-scrollBar eui-yScroll">
                        {helpContent}
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </div>
            <EuiPanel paddingSize="xs" hasShadow={false} hasBorder={false}>
              <EuiSpacer size="s" />
              <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiButton iconType="cross" size="s" onClick={handleClosePopover}>
                    {closePopupButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </div>
        )}
      </EuiPopover>
    ) : (
      <EuiText size="s" color="subdued" data-test-subj={testId('noMultipleArgs')}>
        <EuiIcon type="warning" size="s" color="subdued" />{' '}
        <FormattedMessage
          id="xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.noMultipleArgs"
          defaultMessage="Argument is only supported once per command"
        />
      </EuiText>
    );
  }
);
TextareaInputArgument.displayName = 'TextareaInputArgument';
