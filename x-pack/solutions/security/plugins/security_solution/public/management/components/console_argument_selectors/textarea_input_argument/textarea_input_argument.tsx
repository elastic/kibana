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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import type { CommandArgumentValueSelectorProps } from '../../console/types';

interface TextareaInputArgumentState {
  isPopoverOpen: boolean;
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
export const TextareaInputArgument = memo<
  CommandArgumentValueSelectorProps<
    string,
    TextareaInputArgumentState,
    EndpointCommandDefinitionMeta
  >
>(
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
    requestFocus,
  }) => {
    const testId = useTestIdGenerator(
      `textareaInputArgument-${command.commandDefinition.name}-${argName}-${argIndex}`
    );

    const textAreaHtmlId = useMemo(() => {
      return htmlIdGenerator('textarea')();
    }, []);

    const handleClosePopover = useCallback(() => {
      onChange({
        value,
        valueText,
        store: {
          ...state,
          isPopoverOpen: false,
        },
      });
    }, [onChange, state, value, valueText]);

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
          value: newValue,
          valueText: newValue.replace(/\r?\n/g, ' ').trim(),
          store: state,
        });
      },
      [onChange, state]
    );

    return (
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
                    {NO_INPUT_ENTERED_MESSAGE}
                  </EuiText>
                )}
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="pencil"
                size="xs"
                onClick={handleOpenPopover}
                title={OPEN_INPUT}
                aria-label={OPEN_INPUT}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        {state.isPopoverOpen && (
          <EuiFormRow fullWidth>
            <EuiTextArea
              value={value}
              placeholder={TEXTAREA_PLACEHOLDER_TEXT}
              onChange={handleTextAreaOnChange}
              className={textAreaHtmlId}
              resize="none"
            />
          </EuiFormRow>
        )}
      </EuiPopover>
    );
  }
);
TextareaInputArgument.displayName = 'TextareaInputArgument';
