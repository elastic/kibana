/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidV4 } from 'uuid';
import type { ParsedCommandInterface } from '../../../service/types';
import { parseCommandInput } from '../../../service/parsed_command_input';
import type {
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
        const parsedInput = parseCommandInput(newTextEntered + newRightOfCursor);

        let enteredCommand: ConsoleDataState['input']['enteredCommand'] =
          state.input.enteredCommand;

        if (enteredCommand && adjustedArgState && enteredCommand?.argState !== adjustedArgState) {
          enteredCommand = {
            ...enteredCommand,
            argState: adjustedArgState,
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

            for (const [argName, argDef] of Object.entries(commandDefinition.args ?? {})) {
              if (argDef.SelectorComponent) {
                if (!argsWithValueSelectors) {
                  argsWithValueSelectors = {};
                }

                argsWithValueSelectors[argName] = argDef;
              }
            }

            enteredCommand = {
              argState: {},
              commandDefinition,
              argsWithValueSelectors,
            };
          }
        }

        // Update parsed input with any values that were selected via argument selectors
        setArgSelectorValueToParsedArgs(parsedInput, enteredCommand);

        return {
          ...state,
          input: {
            ...state.input,
            leftOfCursorText: newTextEntered,
            rightOfCursorText: newRightOfCursor,
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
