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

  reconstructCommandText(parsedInput: ParsedCommandInterface): {
    leftOfCursorText?: string;
    rightOfCursorText?: string;
    parsedInput: ParsedCommandInterface;
  } {
    let completeInputText = parsedInput.name;
    for (const [parsedInputArgName, argValues] of Object.entries(parsedInput.args)) {
      for (const value of argValues) {
        if (typeof value === 'boolean' && value) {
          completeInputText += ` --${parsedInputArgName}`;
        } else if (typeof value === 'string') {
          // Always quote string values for consistency
          completeInputText += ` --${parsedInputArgName}="${value}"`;
        }
      }
    }
    return {
      leftOfCursorText: completeInputText,
      rightOfCursorText: '',
      parsedInput,
    };
  }

  syncState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {
    if (!enteredCommand.argsWithValueSelectors) return;
    // Ensure selector values are always reflected in parsed input
    for (const argName of Object.keys(enteredCommand.argsWithValueSelectors)) {
      if (parsedInput.hasArg(argName)) {
        const argumentValues = enteredCommand.argState[argName] ?? [];
        // Always set selector values using valueText for proper command reconstruction
        parsedInput.args[argName] = argumentValues.map((itemState) => itemState.value);
      }
    }
  }

  calculateReplacementLength({
    argChrLength,
    selectorValue,
    input,
    startSearchIndexForNextArg,
    charAfterArgName,
  }: {
    argChrLength: number;
    selectorValue: string;
    input: string;
    startSearchIndexForNextArg: number;
    charAfterArgName: string;
  }): number {
    let replacementLength = argChrLength;
    if (charAfterArgName === '=' || charAfterArgName === ' ') {
      const valueStart = startSearchIndexForNextArg + 1;
      const remainingText = input.substring(valueStart);
      if (selectorValue) {
        const firstChar = remainingText.charAt(0);
        if (
          (firstChar === '"' || firstChar === "'") &&
          remainingText.startsWith(`${firstChar}${selectorValue}${firstChar}`)
        ) {
          replacementLength = argChrLength + 1 + selectorValue.length + 2;
        } else if (
          remainingText.startsWith(`${selectorValue} `) ||
          remainingText === selectorValue
        ) {
          replacementLength = argChrLength + 1 + selectorValue.length;
        }
      }
    }
    return replacementLength;
  }
}
