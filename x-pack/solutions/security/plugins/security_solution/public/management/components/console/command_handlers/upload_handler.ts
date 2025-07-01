/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseCommandHandler } from './base_command_handler';

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

  reconstructCommandText(parsedInput: ParsedCommandInterface): string {
    const configuration: {
      leftOfCursorText?: string;
      rightOfCursorText?: string;
      parsedInput: ParsedCommandInterface;
    } = {
      parsedInput,
    };
    return configuration;
  }

  // No special initializeArgState needed - let the standard selector system handle it

  initializeArgState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand) {}

  // File selectors work through UI picker, not through string initialization

  // Simple syncState - just pass File objects through for execution
  syncState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {
    for (const argName of Object.keys(enteredCommand.argsWithValueSelectors)) {
      if (parsedInput.hasArg(argName)) {
        const argumentValues = enteredCommand.argState[argName] ?? [];
        // Always set selector values using valueText for proper command reconstruction
        parsedInput.args[argName] = argumentValues.map((itemState) => itemState.value);
      }
    }
  }
}
