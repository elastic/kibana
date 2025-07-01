/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseCommandHandler } from './base_command_handler';
import type { ParsedCommandInterface } from '../service/types';
import type { EnteredCommand } from '../components/console_state/types';

/**
 * Command handler for the 'runscript' command that handles custom script execution.
 * Manages argument selectors for ScriptName and CloudFile parameters.
 */
export class RunscriptCommandHandler extends BaseCommandHandler {
  readonly name = 'runscript';

  getEmptyStringArguments(): string[] {
    return ['ScriptName', 'CloudFile'];
  }

  initializeArgState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {
    if (!enteredCommand.argsWithValueSelectors) {
      return;
    }

    // Initialize argument selectors with values from parsed input
    // but only for args that don't already have state (selector takes priority)
    for (const argName of Object.keys(enteredCommand.argsWithValueSelectors)) {
      // Only initialize from parsed input if no selector state exists yet
      if (
        parsedInput.hasArg(argName) &&
        (!enteredCommand.argState[argName] || enteredCommand.argState[argName].length === 0)
      ) {
        const parsedValues = parsedInput.args[argName];
        enteredCommand.argState[argName] = [];

        parsedValues.forEach((parsedValue, index) => {
          enteredCommand.argState[argName][index] = {
            value: parsedValue,
            valueText: String(parsedValue),
          };
        });
      }
    }
  }

  reconstructCommandText(parsedInput: ParsedCommandInterface): string {
    let completeInputText = parsedInput.name;
    
    // Add arguments with their values including updated selector values  
    for (const [parsedInputArgName, argValues] of Object.entries(parsedInput.args)) {
      for (const value of argValues) {
        if (typeof value === 'boolean' && value) {
          completeInputText += ` --${parsedInputArgName}`;
        } else if (typeof value === 'string') {
          // Add quotes if the value contains spaces
          const quotedValue = value.includes(' ') ? `"${value}"` : value;
          completeInputText += ` --${parsedInputArgName}=${quotedValue}`;
        }
      }
    }
    
    return completeInputText;
  }

  syncState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {
    // Ensure selector values are always reflected in parsed input
    if (enteredCommand.argsWithValueSelectors) {
      for (const argName of Object.keys(enteredCommand.argsWithValueSelectors)) {
        if (parsedInput.hasArg(argName)) {
          const argumentValues = enteredCommand.argState[argName] ?? [];
          // Always set selector values using valueText for proper command reconstruction
          parsedInput.args[argName] = argumentValues.map((itemState) => itemState.value);
        }
      }
    }
  }
}
