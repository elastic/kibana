/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommandRegistry } from './command_registry';
import { RunscriptCommandHandler } from './runscript_handler';
import { BaseCommandHandler } from './base_command_handler';
import type { CommandHandler } from './base_command_handler';
import type { EnteredCommand } from '../components/console_state/types';
import type { ParsedCommandInterface } from '../service/types';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('registers a command handler and delegates methods', () => {
      const handler = new RunscriptCommandHandler();
      registry.register(handler);
      expect(registry.getEmptyStringArguments('runscript')).toEqual(['ScriptName', 'CloudFile']);
    });

    it('registers multiple command handlers and delegates to each', () => {
      const runscriptHandler = new RunscriptCommandHandler();
      const mockHandler = new (class extends BaseCommandHandler {
        readonly name = 'other';
      })();
      registry.register(runscriptHandler);
      registry.register(mockHandler);
      expect(registry.getEmptyStringArguments('runscript')).toEqual(['ScriptName', 'CloudFile']);
      expect(registry.getEmptyStringArguments('other')).toEqual([]);
    });
  });

  describe('getEmptyStringArguments', () => {
    it('returns [] for unregistered commands', () => {
      expect(registry.getEmptyStringArguments('unknown')).toEqual([]);
      expect(registry.getEmptyStringArguments('upload')).toEqual([]);
    });

    it('returns correct empty string arguments for registered commands', () => {
      registry.register(new RunscriptCommandHandler());
      expect(registry.getEmptyStringArguments('runscript')).toEqual(['ScriptName', 'CloudFile']);
      expect(registry.getEmptyStringArguments('upload')).toEqual([]);
    });

    it('handles upload command correctly without handler', () => {
      // Upload command uses default boolean flag behavior, not empty string arguments
      const emptyStringArgs = registry.getEmptyStringArguments('upload');
      expect(emptyStringArgs).toEqual([]);
      expect(emptyStringArgs.includes('file')).toBe(false);
    });
  });

  describe('delegation to registered handlers', () => {
    let mockHandler: CommandHandler;
    beforeEach(() => {
      mockHandler = {
        name: 'mock',
        getEmptyStringArguments: jest.fn().mockReturnValue([]),
        reconstructCommandText: jest.fn().mockReturnValue('mock command'),
        syncState: jest.fn(),
      };
    });

    it('calls reconstructCommandText on registered handler', () => {
      registry.register(mockHandler);
      const parsedInput = {
        name: 'mock',
        args: {},
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;
      const result = registry.reconstructCommandText(parsedInput);
      expect(result).toBe('mock command');
      expect(mockHandler.reconstructCommandText).toHaveBeenCalledWith(parsedInput);
    });

    it('calls syncState on registered handler', () => {
      registry.register(mockHandler);
      const parsedInput = {
        name: 'mock',
        args: {},
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;
      const enteredCommand = {} as EnteredCommand;
      registry.syncState(parsedInput, enteredCommand);
      expect(mockHandler.syncState).toHaveBeenCalledWith(parsedInput, enteredCommand);
    });
  });

  describe('fallback/default behavior for unregistered commands', () => {
    it('returns default values and does not throw for unregistered commands', () => {
      const parsedInput = {
        name: 'unknown',
        args: {},
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;
      const enteredCommand = {} as EnteredCommand;
      // Should not throw and should do nothing for void methods
      expect(() => registry.syncState(parsedInput, enteredCommand)).not.toThrow();
      // Should return default object for reconstructCommandText
      expect(registry.reconstructCommandText(parsedInput)).toEqual({ parsedInput });
    });
  });
});
