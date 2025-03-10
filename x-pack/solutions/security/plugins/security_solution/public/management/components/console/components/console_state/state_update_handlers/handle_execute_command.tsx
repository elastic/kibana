/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import React from 'react';
import { executionTranslations } from './translations';
import type { ParsedCommandInterface } from '../../../service/types';
import { ConsoleCodeBlock } from '../../console_code_block';
import { handleInputAreaState } from './handle_input_area_state';
import { HelpCommandArgument } from '../../builtin_commands/help_command_argument';
import type {
  CommandHistoryItem,
  ConsoleDataAction,
  ConsoleDataState,
  ConsoleStoreReducer,
} from '../types';
import { UnknownCommand } from '../../unknown_comand';
import { BadArgument } from '../../bad_argument';
import { ValidationError } from '../../validation_error';
import type { Command, CommandDefinition, CommandExecutionComponentProps } from '../../../types';

const toCliArgumentOption = (argName: string) => `--${argName}`;

const getRequiredArguments = (argDefinitions: CommandDefinition['args']): string[] => {
  if (!argDefinitions) {
    return [];
  }

  return Object.entries(argDefinitions)
    .filter(([_, argDef]) => argDef.required)
    .map(([argName]) => argName);
};

const getUnknownArguments = (
  inputArgs: ParsedCommandInterface['args'],
  argDefinitions: CommandDefinition['args'] | undefined
): string[] => {
  const response: string[] = [];

  Object.keys(inputArgs).forEach((argName) => {
    if (argName !== 'help' && (!argDefinitions || !argDefinitions[argName])) {
      response.push(argName);
    }
  });

  return response;
};

const getExclusiveOrArgs = (argDefinitions: CommandDefinition['args']): string[] => {
  if (!argDefinitions) {
    return [];
  }

  const exclusiveOrArgs: string[] = [];

  return Object.entries(argDefinitions).reduce((acc, [argName, argDef]) => {
    if (argDef.exclusiveOr) {
      acc.push(argName);
    }
    return acc;
  }, exclusiveOrArgs);
};

const updateStateWithNewCommandHistoryItem = (
  state: ConsoleDataState,
  newHistoryItem: ConsoleDataState['commandHistory'][number]
): ConsoleDataState => {
  const updatedState = handleInputAreaState(state, {
    type: 'updateInputHistoryState',
    payload: {
      command: newHistoryItem.command.input,
      display: newHistoryItem.command.inputDisplay,
    },
  });

  updatedState.commandHistory = [...state.commandHistory, newHistoryItem];

  return updatedState;
};

const UnknownCommandDefinition: CommandDefinition = {
  name: 'unknown-command',
  about: 'unknown command',
  RenderComponent: () => null,
};

const createCommandExecutionState = (
  store: CommandExecutionComponentProps['store'] = {}
): CommandHistoryItem['state'] => {
  return {
    status: 'pending',
    store,
  };
};

const cloneCommandDefinitionWithNewRenderComponent = (
  command: Command,
  RenderComponent: CommandDefinition['RenderComponent']
): Command => {
  return {
    ...command,
    commandDefinition: {
      ...command.commandDefinition,
      // We use the original command definition, but replace
      // the RenderComponent for this invocation
      RenderComponent,
    },
  };
};

const createCommandHistoryEntry = (
  command: CommandHistoryItem['command'],
  state: CommandHistoryItem['state'] = createCommandExecutionState(),
  isValid: CommandHistoryItem['isValid'] = true
): CommandHistoryItem => {
  return {
    id: uuidV4(),
    isValid,
    enteredAt: new Date().toISOString(),
    command,
    state,
  };
};

export const handleExecuteCommand: ConsoleStoreReducer<
  ConsoleDataAction & { type: 'executeCommand' }
> = (state, action) => {
  const { parsedInput, enteredCommand, input: fullInputText } = action.payload;

  if (parsedInput.name === '') {
    return state;
  }

  const commandDefinition: CommandDefinition | undefined = enteredCommand?.commandDefinition;

  // Unknown command
  if (!commandDefinition) {
    return updateStateWithNewCommandHistoryItem(
      state,
      createCommandHistoryEntry(
        {
          input: parsedInput.input,
          inputDisplay: fullInputText,
          args: parsedInput,
          commandDefinition: {
            ...UnknownCommandDefinition,
            RenderComponent: UnknownCommand,
          },
        },
        undefined,
        false
      )
    );
  }

  const command: Command = {
    input: parsedInput.input,
    inputDisplay: fullInputText,
    args: parsedInput,
    commandDefinition,
  };
  const requiredArgs = getRequiredArguments(commandDefinition.args);
  const exclusiveOrArgs = getExclusiveOrArgs(commandDefinition.args);

  const exclusiveOrErrorMessage = executionTranslations.onlyOneFromExclusiveOr(
    exclusiveOrArgs.map(toCliArgumentOption).join(', ')
  );

  // If args were entered, then validate them
  if (parsedInput.hasArgs) {
    // Show command help
    if (parsedInput.hasArg('help')) {
      if (
        Object.keys(parsedInput.args).length > 1 ||
        parsedInput.args.help.length > 1 ||
        parsedInput.args.help[0] !== true
      ) {
        return updateStateWithNewCommandHistoryItem(
          state,
          createCommandHistoryEntry(
            cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
            undefined,
            false
          )
        );
      }
      if (commandDefinition?.validate) {
        const validationResult = commandDefinition.validate(command);
        if (validationResult !== true) {
          return updateStateWithNewCommandHistoryItem(
            state,
            createCommandHistoryEntry(
              cloneCommandDefinitionWithNewRenderComponent(command, HelpCommandArgument),
              createCommandExecutionState({
                errorMessage: validationResult,
              }),
              false
            )
          );
        }
      }
      return updateStateWithNewCommandHistoryItem(
        state,
        createCommandHistoryEntry(
          cloneCommandDefinitionWithNewRenderComponent(command, HelpCommandArgument),
          undefined,
          false
        )
      );
    }

    // Command supports no arguments
    if (!commandDefinition.args || Object.keys(commandDefinition.args).length === 0) {
      return updateStateWithNewCommandHistoryItem(
        state,
        createCommandHistoryEntry(
          cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
          createCommandExecutionState({
            errorMessage: executionTranslations.NO_ARGUMENTS_SUPPORTED,
          }),
          false
        )
      );
    }

    // no unknown arguments allowed
    const unknownInputArgs = getUnknownArguments(parsedInput.args, commandDefinition.args);

    if (unknownInputArgs.length) {
      return updateStateWithNewCommandHistoryItem(
        state,
        createCommandHistoryEntry(
          cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
          createCommandExecutionState({
            errorMessage: executionTranslations.unknownArgument(
              unknownInputArgs.length,
              parsedInput.name,
              unknownInputArgs.map(toCliArgumentOption).join(', ')
            ),
          }),
          false
        )
      );
    }

    // Missing required Arguments
    for (const requiredArg of requiredArgs) {
      if (!parsedInput.args[requiredArg]) {
        return updateStateWithNewCommandHistoryItem(
          state,

          createCommandHistoryEntry(
            cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
            createCommandExecutionState({
              errorMessage: (
                <ConsoleCodeBlock>
                  {executionTranslations.missingRequiredArg(requiredArg)}
                </ConsoleCodeBlock>
              ),
            }),
            false
          )
        );
      }
    }

    // Validate exclusiveOr arguments, can only have one.
    const exclusiveArgsUsed = exclusiveOrArgs.filter((arg) => parsedInput.args[arg]);
    if (exclusiveArgsUsed.length > 1) {
      return updateStateWithNewCommandHistoryItem(
        state,
        createCommandHistoryEntry(
          cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
          createCommandExecutionState({
            errorMessage: exclusiveOrErrorMessage,
          }),
          false
        )
      );
    }

    // Validate each argument given to the command
    for (const argName of Object.keys(parsedInput.args)) {
      const argDefinition = commandDefinition.args?.[argName];
      const argInput = parsedInput.args[argName];

      // Unknown argument
      if (!argDefinition) {
        return updateStateWithNewCommandHistoryItem(
          state,
          createCommandHistoryEntry(
            cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),

            createCommandExecutionState({
              errorMessage: (
                <ConsoleCodeBlock>{executionTranslations.unsupportedArg(argName)}</ConsoleCodeBlock>
              ),
            }),
            false
          )
        );
      }

      // does not allow multiple values
      if (!argDefinition.allowMultiples && Array.isArray(argInput) && argInput.length > 1) {
        return updateStateWithNewCommandHistoryItem(
          state,
          createCommandHistoryEntry(
            cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
            createCommandExecutionState({
              errorMessage: (
                <ConsoleCodeBlock>
                  {executionTranslations.noMultiplesAllowed(argName)}
                </ConsoleCodeBlock>
              ),
            }),
            false
          )
        );
      }

      if (argDefinition.mustHaveValue !== undefined && argDefinition.mustHaveValue !== false) {
        let dataValidationError = '';

        if (argInput.length === 0) {
          dataValidationError = executionTranslations.mustHaveValue(argName);
        } else {
          argInput.some((argValue, index) => {
            switch (argDefinition.mustHaveValue) {
              case true:
              case 'non-empty-string':
                if (typeof argValue === 'boolean') {
                  dataValidationError = executionTranslations.mustHaveValue(argName);
                } else if (
                  argDefinition.mustHaveValue === 'non-empty-string' &&
                  argValue.trim().length === 0
                ) {
                  dataValidationError = executionTranslations.mustHaveValue(argName);
                }
                break;

              case 'truthy':
                if (!argValue) {
                  dataValidationError = executionTranslations.mustHaveValue(argName);
                }
                break;

              case 'number':
              case 'number-greater-than-zero':
                if (typeof argValue === 'boolean') {
                  dataValidationError = executionTranslations.mustHaveValue(argName);
                } else {
                  const valueNumber = Number(argValue);

                  if (!Number.isSafeInteger(valueNumber)) {
                    dataValidationError = executionTranslations.mustBeNumber(argName);
                  } else {
                    if (argDefinition.mustHaveValue === 'number-greater-than-zero') {
                      if (valueNumber <= 0) {
                        dataValidationError = executionTranslations.mustBeGreaterThanZero(argName);
                      }
                    }
                  }

                  // If no errors, then update (mutate) the value so that correct
                  // format reaches the execution component
                  if (!dataValidationError) {
                    argInput[index] = valueNumber;
                  }
                }
                break;
            }

            return !!dataValidationError;
          });
        }

        if (dataValidationError) {
          return updateStateWithNewCommandHistoryItem(
            state,
            createCommandHistoryEntry(
              cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),

              createCommandExecutionState({
                errorMessage: <ConsoleCodeBlock>{dataValidationError}</ConsoleCodeBlock>,
              }),
              false
            )
          );
        }
      }

      // Call validation callback if one was defined for the argument
      if (argDefinition.validate) {
        const validationResult = argDefinition.validate(argInput);

        if (validationResult !== true) {
          return updateStateWithNewCommandHistoryItem(
            state,
            createCommandHistoryEntry(
              cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
              createCommandExecutionState({
                errorMessage: (
                  <ConsoleCodeBlock>
                    {executionTranslations.argValueValidatorError(argName, validationResult)}
                  </ConsoleCodeBlock>
                ),
              }),
              false
            )
          );
        }
      }
    }
  } else if (requiredArgs.length > 0) {
    return updateStateWithNewCommandHistoryItem(
      state,
      createCommandHistoryEntry(
        cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
        createCommandExecutionState({
          errorMessage: (
            <ConsoleCodeBlock>
              {executionTranslations.missingArguments(
                requiredArgs.map((argName) => toCliArgumentOption(argName)).join(', ')
              )}
            </ConsoleCodeBlock>
          ),
        }),
        false
      )
    );
  } else if (exclusiveOrArgs.length > 0) {
    return updateStateWithNewCommandHistoryItem(
      state,
      createCommandHistoryEntry(
        cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
        createCommandExecutionState({
          errorMessage: exclusiveOrErrorMessage,
        }),
        false
      )
    );
  } else if (commandDefinition.mustHaveArgs) {
    return updateStateWithNewCommandHistoryItem(
      state,
      createCommandHistoryEntry(
        cloneCommandDefinitionWithNewRenderComponent(command, BadArgument),
        createCommandExecutionState({
          errorMessage: (
            <ConsoleCodeBlock>{executionTranslations.MUST_HAVE_AT_LEAST_ONE_ARG}</ConsoleCodeBlock>
          ),
        }),
        false
      )
    );
  }

  // if the Command definition has a `validate()` callback, then call it now
  if (commandDefinition.validate) {
    const validationResult = commandDefinition.validate(command);
    if (validationResult !== true) {
      return updateStateWithNewCommandHistoryItem(
        state,
        createCommandHistoryEntry(
          cloneCommandDefinitionWithNewRenderComponent(command, ValidationError),
          createCommandExecutionState({
            errorMessage: validationResult,
          }),
          false
        )
      );
    }
  }

  // All is good. Execute the command
  return updateStateWithNewCommandHistoryItem(state, createCommandHistoryEntry(command));
};
