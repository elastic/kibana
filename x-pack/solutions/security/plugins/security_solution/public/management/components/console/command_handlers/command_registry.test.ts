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

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('register', () => {
    it('should register a command handler', () => {
      const handler = new RunscriptCommandHandler();
      registry.register(handler);

      // Test registration by checking if methods work for the registered command
      expect(registry.getEmptyStringArguments('runscript')).toEqual(['ScriptName', 'CloudFile']);
    });

    it('should register multiple command handlers', () => {
      const runscriptHandler = new RunscriptCommandHandler();
      const mockHandler = new (class extends BaseCommandHandler {
        readonly name = 'other';
      })();

      registry.register(runscriptHandler);
      registry.register(mockHandler);

      // Test both handlers are registered by checking their functionality
      expect(registry.getEmptyStringArguments('runscript')).toEqual(['ScriptName', 'CloudFile']);
      expect(registry.getEmptyStringArguments('other')).toEqual([]);
    });
  });

  describe('getEmptyStringArguments', () => {
    it('should return empty array for unregistered commands', () => {
      expect(registry.getEmptyStringArguments('unknown')).toEqual([]);
      expect(registry.getEmptyStringArguments('upload')).toEqual([]); // No handler needed
    });

    it('should return correct empty string arguments for registered commands', () => {
      registry.register(new RunscriptCommandHandler());

      expect(registry.getEmptyStringArguments('runscript')).toEqual(['ScriptName', 'CloudFile']);
      expect(registry.getEmptyStringArguments('upload')).toEqual([]); // No handler, uses default
    });

    it('should handle upload command correctly without handler', () => {
      // Upload command doesn't need a handler - uses default boolean flag behavior
      const emptyStringArgs = registry.getEmptyStringArguments('upload');
      expect(emptyStringArgs).toEqual([]);

      // This means --file with no value gets boolean true, which file selectors can detect
      expect(emptyStringArgs.includes('file')).toBe(false);
    });
  });

  describe('command handler methods', () => {
    let mockHandler: CommandHandler;

    beforeEach(() => {
      mockHandler = {
        name: 'mock',
        getEmptyStringArguments: jest.fn().mockReturnValue([]),
        initializeArgState: jest.fn(),
        reconstructCommandText: jest.fn().mockReturnValue('mock command'),
        syncState: jest.fn(),
      };
    });

    it('should call initializeArgState on registered handler', () => {
      registry.register(mockHandler);
      // @ts-expect-error: Partial mock for test purposes
      const parsedInput = { name: 'mock', args: {}, hasArg: jest.fn() };
      // @ts-expect-error: enteredCommand can be any shape for test
      const enteredCommand = {};

      registry.initializeArgState(parsedInput, enteredCommand);

      expect(mockHandler.initializeArgState).toHaveBeenCalledWith(parsedInput, enteredCommand);
    });

    it('should call reconstructCommandText on registered handler', () => {
      registry.register(mockHandler);
      // @ts-expect-error: Partial mock for test purposes
      const parsedInput = { name: 'mock', args: {}, hasArg: jest.fn() };

      const result = registry.reconstructCommandText(parsedInput);

      expect(result).toBe('mock command');
      expect(mockHandler.reconstructCommandText).toHaveBeenCalledWith(parsedInput);
    });

    it('should call syncState on registered handler', () => {
      registry.register(mockHandler);
      // @ts-expect-error: Partial mock for test purposes
      const parsedInput = { name: 'mock', args: {}, hasArg: jest.fn() };
      // @ts-expect-error: enteredCommand can be any shape for test
      const enteredCommand = {};

      registry.syncState(parsedInput, enteredCommand);

      expect(mockHandler.syncState).toHaveBeenCalledWith(parsedInput, enteredCommand);
    });

    it('should not throw when calling methods on unregistered commands', () => {
      // @ts-expect-error: Partial mock for test purposes
      const parsedInput = { name: 'unknown', args: {}, hasArg: jest.fn() };
      // @ts-expect-error: enteredCommand can be any shape for test
      const enteredCommand = {};

      expect(() => registry.initializeArgState(parsedInput, enteredCommand)).not.toThrow();
      expect(() => registry.syncState(parsedInput, enteredCommand)).not.toThrow();
      expect(registry.reconstructCommandText(parsedInput)).toBeUndefined();
    });
  });
});
