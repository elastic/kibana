/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidV4 } from 'uuid';
import type { ParsedCommandInterface } from '../../../service/types';
import {
  parseCommandInput,
  detectAndPreProcessPastedCommand,
} from '../../../service/parsed_command_input';
import type {
  ArgSelectorState,
  ConsoleDataAction,
  ConsoleDataState,
  ConsoleStoreReducer,
  EnteredCommand,
} from '../types';

export const INPUT_DEFAULT_PLACEHOLDER_TEXT = i18n.translate(
  'xpack.securitySolution.handleInputAreaState.inputPlaceholderText',
  {
    defaultMessage: 'Submit response action',
  }
);

const setArgSelectorValueToParsedArgs = (
  parsedInput: ParsedCommandInterface,
  enteredCommand: EnteredCommand | undefined
) => {
  if (enteredCommand && enteredCommand.argsWithValueSelectors) {
    for (const argName of Object.keys(enteredCommand.argsWithValueSelectors)) {
      if (parsedInput.hasArg(argName)) {
        const argumentValues = enteredCommand.argState[argName] ?? [];

        parsedInput.args[argName] = argumentValues.map((itemState) => itemState.value);
      }
    }
  }
};

type InputAreaStateAction = ConsoleDataAction & {
  type:
    | 'updateInputPopoverState'
    | 'updateInputHistoryState'
    | 'clearInputHistoryState'
    | 'updateInputTextEnteredState'
    | 'updateInputPlaceholderState'
    | 'setInputState'
    | 'updateInputCommandArgState';
};

export const handleInputAreaState: ConsoleStoreReducer<InputAreaStateAction> = (
  state,
  { type, payload }
) => {
  switch (type) {
    case 'updateInputPopoverState':
      if (state.input.showPopover !== payload.show) {
        return {
          ...state,
          input: {
            ...state.input,
            showPopover: payload.show,
          },
        };
      }
      break;

    case 'updateInputHistoryState':
      return {
        ...state,
        input: {
          ...state.input,
          // Keeping the last 100 entries only for now
          history: [
            {
              id: uuidV4(),
              input: payload.command,
              display: payload.display ?? payload.command,
              // We only store the `value` and `valueText`. `store` property of each argument's state
              // is component instance specific data.
              argState: Object.entries(payload.argState || {}).reduce(
                (acc, [argName, argValuesState]) => {
                  acc[argName] = argValuesState.map(({ value, valueText }) => {
                    return { value, valueText };
                  });

                  return acc;
                },
                {} as Record<string, ArgSelectorState[]>
              ),
            },
            ...state.input.history.slice(0, 99),
          ],
        },
      };

    case 'clearInputHistoryState':
      return {
        ...state,
        input: {
          ...state.input,
          history: [],
        },
      };

    case 'updateInputTextEnteredState':
      const {
        leftOfCursorText: newTextEntered,
        rightOfCursorText: newRightOfCursor = '',
        argState: adjustedArgState,
      } = typeof payload === 'function' ? payload(state.input) : payload;

      if (
        state.input.leftOfCursorText !== newTextEntered ||
        state.input.rightOfCursorText !== newRightOfCursor
      ) {
        const fullCommand = newTextEntered + newRightOfCursor;

        // Pre-process pasted commands to handle selector arguments like --ScriptName
        const preProcessResult = detectAndPreProcessPastedCommand(fullCommand, state.commands);

        // Use cleaned command for parsing if selector arguments were found
        const commandToParse = preProcessResult.hasSelectorArguments
          ? preProcessResult.cleanedCommand
          : fullCommand;

        const parsedInput = parseCommandInput(commandToParse, state.commands);

        let enteredCommand: ConsoleDataState['input']['enteredCommand'] =
          state.input.enteredCommand;

        // Merge extracted argState from pre-processing with adjusted argState
        let finalArgState = adjustedArgState;

        if (
          preProcessResult.hasSelectorArguments &&
          Object.keys(preProcessResult.extractedArgState).length > 0
        ) {
          finalArgState = {
            ...adjustedArgState,
            ...preProcessResult.extractedArgState,
          };
        }

        if (enteredCommand && finalArgState && enteredCommand?.argState !== finalArgState) {
          enteredCommand = {
            ...enteredCommand,
            argState: finalArgState,
          };
        }

        // Determine if `enteredCommand` should be re-defined
        if (
          (parsedInput.name &&
            (!enteredCommand || parsedInput.name !== enteredCommand.commandDefinition.name)) ||
          (!parsedInput.name && enteredCommand)
        ) {
          enteredCommand = undefined;

          const commandDefinition = state.commands.find((def) => def.name === parsedInput.name);

          if (commandDefinition) {
            let argsWithValueSelectors: EnteredCommand['argsWithValueSelectors'];
            const argState: EnteredCommand['argState'] = finalArgState ?? {};

            for (const [argName, argDef] of Object.entries(commandDefinition.args ?? {})) {
              if (argDef.SelectorComponent) {
                if (!argsWithValueSelectors) {
                  argsWithValueSelectors = {};
                }

                argsWithValueSelectors[argName] = argDef;

                // Clear selector argument values for clean commands (e.g., from history)
                // This ensures specific selectors start fresh instead of showing old values - when command argument contains selectorStringDefaultValue set to true
                if (parsedInput.hasArg(argName) && parsedInput.args[argName]?.includes(true)) {
                  argState[argName] = [];
                }
              }
            }

            enteredCommand = {
              argState,
              commandDefinition,
              argsWithValueSelectors,
            };
          }
        }

        // Update parsed input with any values that were selected via argument selectors
        setArgSelectorValueToParsedArgs(parsedInput, enteredCommand);

        // Use cleaned command text for display if pre-processing occurred
        const displayLeftText = preProcessResult.hasSelectorArguments
          ? preProcessResult.cleanedCommand
          : newTextEntered;
        const displayRightText = preProcessResult.hasSelectorArguments ? '' : newRightOfCursor;

        return {
          ...state,
          input: {
            ...state.input,
            leftOfCursorText: displayLeftText,
            rightOfCursorText: displayRightText,
            parsedInput,
            enteredCommand,
          },
        };
      }
      break;

    case 'updateInputPlaceholderState':
      if (state.input.placeholder !== payload.placeholder) {
        return {
          ...state,
          input: {
            ...state.input,
            placeholder: payload.placeholder || INPUT_DEFAULT_PLACEHOLDER_TEXT,
          },
        };
      }
      break;

    case 'setInputState':
      if (state.input.visibleState !== payload.value) {
        return {
          ...state,
          input: {
            ...state.input,
            visibleState: payload.value,
          },
        };
      }
      break;

    case 'updateInputCommandArgState':
      if (state.input.enteredCommand) {
        const { name: argName, instance: argInstance, state: newArgState } = payload;
        const updatedArgState = [...(state.input.enteredCommand.argState[argName] ?? [])];

        updatedArgState[argInstance] = newArgState;

        const updatedEnteredCommand = {
          ...state.input.enteredCommand,
          argState: {
            ...state.input.enteredCommand.argState,
            [argName]: updatedArgState,
          },
        };

        // store a new version of parsed input that contains the updated selector value
        const updatedParsedInput = parseCommandInput(
          state.input.leftOfCursorText + state.input.rightOfCursorText
        );
        setArgSelectorValueToParsedArgs(updatedParsedInput, updatedEnteredCommand);

        return {
          ...state,
          input: {
            ...state.input,
            parsedInput: updatedParsedInput,
            enteredCommand: updatedEnteredCommand,
          },
        };
      }
      break;
  }

  // No updates needed. Just return original state
  return state;
};
