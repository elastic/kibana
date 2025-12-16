/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIsMounted } from '@kbn/securitysolution-hook-utils';
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
   * Any help content to be made available in the popup. If defined, a help icon will
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
  /** Message to display on help icons tooltip when no help is available */
  helpNotAvailableTooltip?: string;
  /** Label for the close button in the popup */
  closePopupButtonLabel?: string;
  /** If set to `false`, the help icons in the popup will not be shown. Default is is `true` */
  showHelpIcon?: boolean;
  'data-test-subj'?: string;
}

export const OPEN_INPUT = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.openInputButton',
  { defaultMessage: 'Edit values' }
);

export const TEXTAREA_PLACEHOLDER_TEXT = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.textareaPlaceholderText',
  { defaultMessage: 'Enter data here' }
);

export const NO_INPUT_ENTERED_MESSAGE = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.noInputEnteredMessage',
  { defaultMessage: 'Click to enter values' }
);

export const HELP_ICON_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.helpIconLabel',
  { defaultMessage: 'Toggle instructions' }
);

export const CLOSE_POPUP_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.closePopupButtonLabel',
  { defaultMessage: 'Apply' }
);

export const HELP_NOT_AVAILABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.textAreaInputArgument.helpNotAvailable',
  { defaultMessage: 'No instructions available' }
);

/**
 * Console argument component that displays a popup textarea for user to enter free-form data.
 */
export const TextareaInputArgument = memo<TextareaInputArgumentProps>(
  ({
    value: propsValue,
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
    helpNotAvailableTooltip = HELP_NOT_AVAILABLE_TOOLTIP,
    closePopupButtonLabel = CLOSE_POPUP_BUTTON_LABEL,
    width,
    textareaLabel,
    helpContent,
    showHelpIcon = true,
    'data-test-subj': dataTestSubj,
  }) => {
    const value = propsValue ?? '';
    const testId = useTestIdGenerator(
      dataTestSubj ??
        `textareaInputArgument-${command.commandDefinition.name}-${argName}-${argIndex}`
    );
    const isMounted = useIsMounted();
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
          max-width: 50%;
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

    useEffect(() => {
      // If the user picked a different script, after having already opened the help area, make
      // sure we reset the `showHelpContent` if the new script has no help content.
      if (isMounted() && showHelpContent && !helpContent) {
        setShowHelpContent(false);
      }
    }, [helpContent, isMounted, showHelpContent]);

    useEffect(() => {
      // If the argument selector should not be rendered, then at least set the `value` to a string
      // so that the normal console argument validations can be invoked if the user still ENTERs
      // the command
      if (isMounted() && !shouldRender && propsValue !== '') {
        onChange({
          value: '',
          valueText: '',
          store: state,
        });
      }
    }, [onChange, shouldRender, state, propsValue, isMounted]);

    return shouldRender ? (
      <EuiPopover
        isOpen={state.isPopoverOpen}
        anchorPosition="upCenter"
        data-test-subj={testId()}
        closePopover={handleClosePopover}
        initialFocus={`textarea.${textAreaHtmlId}`}
        panelProps={{ 'data-test-subj': testId('popoverPanel') }}
        panelPaddingSize="s"
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
            {showHelpIcon && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="pencil"
                  size="xs"
                  onClick={handleOpenPopover}
                  title={openLabel}
                  aria-label={openLabel}
                  data-test-subj={testId('openInputButton')}
                  css={css`
                    inline-size: auto;
                    block-size: auto;
                  `}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
      >
        {state.isPopoverOpen && (
          <div css={textareaContainerCss}>
            <EuiPanel paddingSize="none" hasShadow={false} hasBorder={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiTitle size="xxxs" data-test-subj={testId('title')}>
                    <h5>{textareaLabel ?? argName}</h5>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiToolTip content={helpContent ? helpIconLabel : helpNotAvailableTooltip}>
                    <EuiButtonIcon
                      iconType="help"
                      size="xs"
                      onClick={handleHelpOnClick}
                      isSelected={showHelpContent}
                      title={helpIconLabel}
                      aria-label={helpIconLabel}
                      disabled={!helpContent}
                      data-test-subj={testId('helpButton')}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
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
                    data-test-subj={testId('textarea')}
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
                      <EuiText
                        size="s"
                        className="eui-scrollBar eui-yScroll"
                        data-test-subj={testId('helpContent')}
                      >
                        {helpContent}
                      </EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </div>
            <EuiPanel paddingSize="none" hasShadow={false} hasBorder={false}>
              <EuiSpacer size="s" />
              <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    onClick={handleClosePopover}
                    data-test-subj={testId('closeButton')}
                  >
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
