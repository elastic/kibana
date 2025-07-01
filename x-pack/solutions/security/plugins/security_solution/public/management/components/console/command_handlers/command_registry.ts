/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommandHandler } from './base_command_handler';
import type { ParsedCommandInterface } from '../service/types';
import type { EnteredCommand } from '../components/console_state/types';

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
   * Get the handler for a specific command name.
   */
  getHandler(commandName: string): CommandHandler | undefined {
    return this.handlers.get(commandName);
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
   * Initialize argument state from parsed input for commands with selectors.
   */
  initializeArgState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {
    const handler = this.handlers.get(parsedInput.name);
    if (handler?.initializeArgState) {
      handler.initializeArgState(parsedInput, enteredCommand);
    }
  }

  /**
   * Reconstruct command text when selector values change.
   */
  reconstructCommandText(parsedInput: ParsedCommandInterface): string | undefined {
    const handler = this.handlers.get(parsedInput.name);
    return handler?.reconstructCommandText?.(parsedInput);
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
   * Check if a command has a registered handler.
   */
  hasHandler(commandName: string): boolean {
    return this.handlers.has(commandName);
  }

  /**
   * Get all registered command names.
   */
  getRegisteredCommands(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Create and export a singleton instance
export const commandRegistry = new CommandRegistry();
