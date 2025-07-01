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
 * Command handler for the 'upload' command that handles file upload functionality.
 * Uses standard selector behavior without special processing - file selectors are
 * triggered by bare flags and work through the normal selector UI.
 */
export class UploadCommandHandler extends BaseCommandHandler {
  readonly name = 'upload';

  // Upload uses boolean flags (bare flags = true), not empty strings
  // File selectors work with standard selector patterns only
  getEmptyStringArguments(): string[] {
    console.log('getEmptyStringArguments');
    return [];
  }

  // No special initializeArgState needed - let the standard selector system handle it
  // File selectors work through UI picker, not through string initialization

  // Simple syncState - just pass File objects through for execution
  syncState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {
    console.log('UPLOAD syncState called', {
      hasArgsWithValueSelectors: !!enteredCommand.argsWithValueSelectors,
      argState: enteredCommand.argState,
      parsedInputBefore: parsedInput.args,
    });

    if (enteredCommand.argsWithValueSelectors) {
      for (const argName of Object.keys(enteredCommand.argsWithValueSelectors)) {
        const argumentValues = enteredCommand.argState[argName] ?? [];

        console.log(`UPLOAD syncState processing arg: ${argName}`, {
          argumentValues: argumentValues.map((av) => ({
            value: av.value instanceof File ? `File: ${av.value.name}` : av.value,
            valueText: av.valueText,
          })),
        });

        // Filter to only actual File objects for execution
        const fileObjects = argumentValues
          .map((itemState) => itemState.value)
          .filter((value) => value instanceof File);

        console.log(
          `UPLOAD syncState filtered fileObjects for ${argName}:`,
          fileObjects.map((f) => f.name)
        );

        if (fileObjects.length > 0) {
          parsedInput.args[argName] = fileObjects;
          console.log(
            `UPLOAD syncState set parsedInput.args[${argName}]:`,
            parsedInput.args[argName].map((f) => f.name)
          );
        }
      }
    }

    console.log('UPLOAD syncState result:', parsedInput.args);
  }
}
