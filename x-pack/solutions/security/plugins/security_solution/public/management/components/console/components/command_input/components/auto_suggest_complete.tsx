/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { useWithCommandList } from '../../../hooks/state_selectors/use_with_command_list';
import { useInputSuggestion } from '../hooks/use_input_suggestion';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useWithInputTextEntered } from '../../../hooks/state_selectors/use_with_input_text_entered';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';

export interface AutoSuggestCompleteProps {
  'data-test-subj'?: string;
}

/**
 * Handles the suggestions and optionally completion of commands and arguments as the user types.
 */
export const AutoSuggestComplete = memo<AutoSuggestCompleteProps>(
  ({ 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { fullTextEntered, leftOfCursorText, rightOfCursorText, enteredCommand } =
      useWithInputTextEntered();
    const { value: suggestionValue } = useInputSuggestion();
    const dispatch = useConsoleStateDispatch();
    const commandDefinitions = useWithCommandList();

    useEffect(() => {
      if (fullTextEntered.length === 0 || (leftOfCursorText.endsWith(' ') && suggestionValue)) {
        dispatch({
          type: 'updateInputSuggestionState',
          payload: {
            suggestion: { value: '' },
          },
        });
        return;
      }

      // If we don't know the command yet, then let's see if we can suggest one now
      if (!enteredCommand) {
        const commandNameSuggestion = commandDefinitions.find(
          (command) =>
            command.name !== leftOfCursorText && command.name.startsWith(leftOfCursorText)
        );

        const newSuggestionValue = (commandNameSuggestion?.name ?? '').replace(
          leftOfCursorText,
          ''
        );

        if (newSuggestionValue !== suggestionValue) {
          dispatch({
            type: 'updateInputSuggestionState',
            payload: {
              suggestion: { value: newSuggestionValue },
            },
          });
        }
      }

      // Suggest argument names
      if (
        /(--\S+)$/.test(leftOfCursorText) &&
        (!rightOfCursorText || rightOfCursorText.startsWith(' '))
      ) {
        const partialArgName = leftOfCursorText.substring(leftOfCursorText.lastIndexOf('--') + 2);
        const newSuggestionValue = (
          Object.keys(enteredCommand?.commandDefinition?.args ?? {}).find(
            (argName) => argName !== partialArgName && argName.startsWith(partialArgName)
          ) || ''
        ).replace(partialArgName, '');

        if (newSuggestionValue !== suggestionValue) {
          dispatch({
            type: 'updateInputSuggestionState',
            payload: {
              suggestion: { value: newSuggestionValue },
            },
          });
        }
      }
    }, [
      dispatch,
      commandDefinitions,
      suggestionValue,
      fullTextEntered,
      leftOfCursorText,
      rightOfCursorText,
      enteredCommand,
    ]);

    if (!suggestionValue) {
      return null;
    }

    return (
      <span data-test-subj={getTestId()}>
        <EuiTextColor color="subdued">{suggestionValue}</EuiTextColor>
      </span>
    );
  }
);
AutoSuggestComplete.displayName = 'AutoSuggestComplete';
