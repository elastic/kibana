/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiFormRow,
  EuiTextArea,
  EuiText,
  htmlIdGenerator,
  EuiIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import type { CommandArgumentValueSelectorProps } from '../../console/types';

interface TextareaInputArgumentState {
  isPopoverOpen: boolean;
}

interface TextareaInputArgumentProps
  extends CommandArgumentValueSelectorProps<
    string,
    TextareaInputArgumentState,
    EndpointCommandDefinitionMeta
  > {
  width?: string;
  openLabel?: string;
  noInputEnteredMessage?: string;
  textareaLabel?: string;
  textareaPlaceholderLabel?: string;
  helpContent?: React.ReactNode;
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
    width,
    textareaLabel,
    helpContent,
  }) => {
    const testId = useTestIdGenerator(
      `textareaInputArgument-${command.commandDefinition.name}-${argName}-${argIndex}`
    );

    const textAreaHtmlId = useMemo(() => {
      return htmlIdGenerator('textarea')();
    }, []);

    const textareaContainerCss = useMemo(() => {
      return css`
        width: ${width ?? '20vw'};
        min-width: 275px;
      `;
    }, [width]);

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
          isPopoverOpen: true,
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

    return shouldRender ? (
      <EuiPopover
        isOpen={state.isPopoverOpen}
        anchorPosition="upCenter"
        data-test-subj={testId()}
        closePopover={handleClosePopover}
        initialFocus={`textarea.${textAreaHtmlId}`}
        panelProps={{ 'data-test-subj': testId('popoverPanel') }}
        button={
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false} className="eui-textTruncate" onClick={handleOpenPopover}>
              <div className="eui-textTruncate">
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
                disabled={state.isPopoverOpen}
                title={openLabel}
                aria-label={openLabel}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        {
          // FIXME:PT implement `help` below
          state.isPopoverOpen && (
            <div css={textareaContainerCss}>
              <EuiFormRow
                fullWidth
                label={textareaLabel ?? argName}
                labelAppend={<div>{'help'}</div>}
              >
                <EuiTextArea
                  value={value}
                  placeholder={textareaPlaceholderLabel}
                  onChange={handleTextAreaOnChange}
                  className={textAreaHtmlId}
                  resize="none"
                  fullWidth
                />
              </EuiFormRow>
            </div>
          )
        }
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
