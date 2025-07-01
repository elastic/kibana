/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedCommandInterface } from '../service/types';
import type { EnteredCommand } from '../components/console_state/types';

/**
 * Base interface for command-specific handlers that define how different commands
 * should behave in terms of argument parsing, state management, and text reconstruction.
 */
export interface CommandHandler {
  /** The name of the command this handler supports */
  readonly name: string;

  /**
   * Returns the list of argument names that should use empty strings for bare flags
   * instead of boolean true. These are typically selector arguments that can have values.
   */
  getEmptyStringArguments(): string[];

  /**
   * Handle argument state initialization from parsed input for commands with selectors.
   * This is called when command text is updated and selector state needs to be synced.
   */
  initializeArgState?(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void;

  /**
   * Handle command text reconstruction when selector values change.
   * Returns the complete command text including all arguments with proper formatting.
   */
  reconstructCommandText?(parsedInput: ParsedCommandInterface): string;

  /**
   * Handle any additional state synchronization between parsed input and entered command.
   * This is called after parsing to ensure consistency between different state representations.
   */
  syncState?(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void;
}

/**
 * Base class providing common functionality that most command handlers can extend.
 */
export abstract class BaseCommandHandler implements CommandHandler {
  abstract readonly name: string;

  getEmptyStringArguments(): string[] {
    return [];
  }

  /**
   * Helper method to reconstruct command text with proper argument formatting.
   * Handles quoting of values that contain spaces.
   */
  protected buildCommandText(commandName: string, args: Record<string, string[]>): string {
    let commandText = commandName;

    for (const [argName, argValues] of Object.entries(args)) {
      for (const value of argValues) {
        if (typeof value === 'boolean' && value) {
          commandText += ` --${argName}`;
        } else if (typeof value === 'string') {
          // Add quotes if the value contains spaces or is empty
          const needsQuotes = value.includes(' ') || value === '';
          const formattedValue = needsQuotes ? `"${value}"` : value;
          commandText += ` --${argName}=${formattedValue}`;
        } else if (value && typeof value === 'object' && 'name' in value) {
          // Handle File objects - use the filename
          const filename = (value as File).name;
          const needsQuotes = filename.includes(' ');
          const formattedValue = needsQuotes ? `"${filename}"` : filename;
          commandText += ` --${argName}=${formattedValue}`;
        }
      }
    }

    return commandText;
  }
}
