/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { EnteredInput } from '../../components/command_input/lib/entered_input';
import { useConsoleStore } from '../../components/console_state/console_state';
import type { Command } from '../../types';

/**
 * Returns a `Command` interface that represents the command that the user has entered
 * into the console (if any)
 */
export const useInputCommand = (): Command | undefined => {
  const { leftOfCursorText, rightOfCursorText, parsedInput, enteredCommand } =
    useConsoleStore().state.input;

  return useMemo(() => {
    if (enteredCommand) {
      const inputDisplay = new EnteredInput(
        leftOfCursorText,
        rightOfCursorText,
        parsedInput,
        enteredCommand
      ).getFullText(true);

      return {
        inputDisplay,
        input: parsedInput.input,
        args: parsedInput,
        argState: enteredCommand.argState,
        commandDefinition: enteredCommand.commandDefinition,
      };
    }
  }, [enteredCommand, leftOfCursorText, parsedInput, rightOfCursorText]);
};
