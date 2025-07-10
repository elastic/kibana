/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandHandler } from './base_command_handler';
import type { ParsedCommandInterface } from '../service/types';
import type { ArgSelectorState, EnteredCommand } from '../components/console_state/types';

/**
 * Registry for managing command-specific handlers. This centralizes all command-specific
 * logic and eliminates the need for scattered if statements throughout the codebase.
 */
export class CommandRegistry {
  private handlers = new Map<string, CommandHandler>();

  /**
   * Register a command handler for a specific command name.
   */
  register(handler: CommandHandler): void {
    this.handlers.set(handler.name, handler);
  }

  /**
   * Get the list of arguments that should use empty strings for bare flags
   * instead of boolean true for the given command.
   */
  getEmptyStringArguments(commandName: string): string[] {
    const handler = this.handlers.get(commandName);
    return handler?.getEmptyStringArguments() ?? [];
  }

  /**
   * Reconstruct command text when selector values change.
   */
  reconstructCommandText(parsedInput: ParsedCommandInterface): {
    leftOfCursorText?: string;
    rightOfCursorText?: string;
    parsedInput: ParsedCommandInterface;
  } {
    const handler = this.handlers.get(parsedInput.name);
    return (
      handler?.reconstructCommandText?.(parsedInput) ?? {
        parsedInput,
      }
    );
  }

  /**
   * Sync state between parsed input and entered command.
   */
  syncState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {
    const handler = this.handlers.get(parsedInput.name);
    if (handler?.syncState) {
      handler.syncState(parsedInput, enteredCommand);
    }
  }

  /**
   * Calculate replacement length for deduplication for the given command.
   */
  calculateReplacementLength(
    commandName: string,
    args: {
      argChrLength: number;
      argState?: ArgSelectorState;
      selectorValue: string;
      input: string;
      startSearchIndexForNextArg: number;
      charAfterArgName: string;
    }
  ): number {
    const handler = this.handlers.get(commandName);
    if (handler && typeof handler.calculateReplacementLength === 'function') {
      return handler.calculateReplacementLength(args);
    }
    // Default: just replace argument name (no deduplication logic)
    return args.argChrLength;
  }
}

// Create and export a singleton instance
export const commandRegistry = new CommandRegistry();
