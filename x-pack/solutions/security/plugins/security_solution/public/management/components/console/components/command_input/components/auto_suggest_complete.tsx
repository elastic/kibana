/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { css } from '@emotion/react';
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
      // If user has not entered anything, or the text to the left of the cursor is not a space, then reset the suggestion (if any)
      if (fullTextEntered.length === 0 || (leftOfCursorText.endsWith(' ') && suggestionValue)) {
        dispatch({
          type: 'updateInputSuggestionState',
          payload: {
            suggestion: { value: '' },
          },
        });

        return;
      }

      // To provide suggestions, the text to the right of the cursor must be empty or start with a space.
      // This ensure we are not suggesting values when user's cursor is between full words.
      if (!rightOfCursorText || rightOfCursorText.startsWith(' ')) {
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

          return;
        }

        // Suggest argument names
        if (/(--\S+)$/.test(leftOfCursorText)) {
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

          return;
        }
      }

      // Nothing to suggest - ensure no suggestion is stored in state
      if (suggestionValue) {
        dispatch({
          type: 'updateInputSuggestionState',
          payload: {
            suggestion: { value: '' },
          },
        });
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
      <span
        data-test-subj={getTestId()}
        css={css`
          user-select: none;
        `}
      >
        <EuiTextColor color="subdued">{suggestionValue}</EuiTextColor>
      </span>
    );
  }
);
AutoSuggestComplete.displayName = 'AutoSuggestComplete';
