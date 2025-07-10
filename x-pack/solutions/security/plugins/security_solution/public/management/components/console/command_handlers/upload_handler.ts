/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseCommandHandler } from './base_command_handler';
import type { ParsedCommandInterface } from '../service/types';
import type { ArgSelectorState, EnteredCommand } from '../components/console_state/types';

/**
 * Command handler for the 'upload' command that handles file upload functionality.
 * Uses standard selector behavior without special processing - file selectors are
 * triggered by bare flags and work through the normal selector UI.
 */
export class UploadCommandHandler extends BaseCommandHandler {
  readonly name = 'upload';

  // Upload uses boolean flags (bare flags = true), not empty strings
  // File selectors work with standard selector patterns only
  getEmptyStringArguments(): string[] {
    return [];
  }

  reconstructCommandText(parsedInput: ParsedCommandInterface): {
    leftOfCursorText?: string;
    rightOfCursorText?: string;
    parsedInput: ParsedCommandInterface;
  } {
    return {
      parsedInput,
    };
  }

  // Simple syncState - just pass File objects through for execution
  syncState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {
    if (!enteredCommand.argsWithValueSelectors) return;

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
    argState,
    input,
    startSearchIndexForNextArg,
    charAfterArgName,
  }: {
    argChrLength: number;
    argState?: ArgSelectorState;
    input: string;
    startSearchIndexForNextArg: number;
    charAfterArgName: string;
  }): number {
    let replacementLength = argChrLength;
    if (charAfterArgName === '=' || charAfterArgName === ' ') {
      const valueStart = startSearchIndexForNextArg + 1;
      const remainingText = input.substring(valueStart);
      if (argState?.value instanceof File) {
        const filename = argState.value.name;
        const firstChar = remainingText.charAt(0);
        if (
          (firstChar === '"' || firstChar === "'") &&
          remainingText.startsWith(`${firstChar}${filename}${firstChar}`)
        ) {
          replacementLength = argChrLength + 1 + filename.length + 2;
        } else if (remainingText.startsWith(`${filename} `) || remainingText === filename) {
          replacementLength = argChrLength + 1 + filename.length;
        }
      }
    }
    return replacementLength;
  }
}
