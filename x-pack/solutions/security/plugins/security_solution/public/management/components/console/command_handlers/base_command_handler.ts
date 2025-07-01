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

  // Upload uses boolean flags (bare flags = true), not empty strings
  // File selectors work with standard selector patterns only
  getEmptyStringArguments(): string[] {
    return [];
  }

  reconstructCommandText(parsedInput: ParsedCommandInterface): string {
    return {};
  }

  initializeArgState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand) {}

  syncState(parsedInput: ParsedCommandInterface, enteredCommand: EnteredCommand): void {}
}
