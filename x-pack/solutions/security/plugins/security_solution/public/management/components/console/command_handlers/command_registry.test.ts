/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommandRegistry } from './command_registry';
import { RunscriptCommandHandler } from './runscript_handler';
import { UploadCommandHandler } from './upload_handler';
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

      expect(registry.hasHandler('runscript')).toBe(true);
      expect(registry.getHandler('runscript')).toBe(handler);
    });

    it('should register multiple command handlers', () => {
      const runscriptHandler = new RunscriptCommandHandler();
      const uploadHandler = new UploadCommandHandler();

      registry.register(runscriptHandler);
      registry.register(uploadHandler);

      expect(registry.hasHandler('runscript')).toBe(true);
      expect(registry.hasHandler('upload')).toBe(true);
      expect(registry.getRegisteredCommands()).toEqual(['runscript', 'upload']);
    });
  });

  describe('getHandler', () => {
    it('should return undefined for unregistered commands', () => {
      expect(registry.getHandler('unknown')).toBeUndefined();
    });

    it('should return the correct handler for registered commands', () => {
      const handler = new RunscriptCommandHandler();
      registry.register(handler);

      expect(registry.getHandler('runscript')).toBe(handler);
    });
  });

  describe('getEmptyStringArguments', () => {
    it('should return empty array for unregistered commands', () => {
      expect(registry.getEmptyStringArguments('unknown')).toEqual([]);
    });

    it('should return correct empty string arguments for registered commands', () => {
      registry.register(new RunscriptCommandHandler());
      registry.register(new UploadCommandHandler());

      expect(registry.getEmptyStringArguments('runscript')).toEqual(['ScriptName', 'CloudFile']);
      expect(registry.getEmptyStringArguments('upload')).toEqual([]); // File objects, not strings
    });

    it('should handle upload --file= correctly with boolean flag', () => {
      registry.register(new UploadCommandHandler());
      
      // File arguments should use boolean flags, not empty strings
      const emptyStringArgs = registry.getEmptyStringArguments('upload');
      expect(emptyStringArgs).toEqual([]);
      
      // This means --file with no value gets boolean true, which file selectors can detect
      expect(emptyStringArgs.includes('file')).toBe(false);
    });
  });

  describe('hasHandler', () => {
    it('should return false for unregistered commands', () => {
      expect(registry.hasHandler('unknown')).toBe(false);
    });

    it('should return true for registered commands', () => {
      registry.register(new RunscriptCommandHandler());
      expect(registry.hasHandler('runscript')).toBe(true);
    });
  });

  describe('getRegisteredCommands', () => {
    it('should return empty array when no commands are registered', () => {
      expect(registry.getRegisteredCommands()).toEqual([]);
    });

    it('should return all registered command names', () => {
      registry.register(new RunscriptCommandHandler());
      registry.register(new UploadCommandHandler());

      expect(registry.getRegisteredCommands()).toEqual(['runscript', 'upload']);
    });
  });

  describe('command handler methods', () => {
    let mockHandler: CommandHandler;

    beforeEach(() => {
      mockHandler = {
        name: 'test',
        getEmptyStringArguments: jest.fn(() => ['arg1']),
        initializeArgState: jest.fn(),
        reconstructCommandText: jest.fn(() => 'test --arg1=value'),
        syncState: jest.fn(),
      };
      registry.register(mockHandler);
    });

    it('should call initializeArgState on handler', () => {
      const parsedInput = { name: 'test', args: {}, hasArg: jest.fn() } as any;
      const enteredCommand = {} as any;

      registry.initializeArgState(parsedInput, enteredCommand);

      expect(mockHandler.initializeArgState).toHaveBeenCalledWith(parsedInput, enteredCommand);
    });

    it('should call reconstructCommandText on handler', () => {
      const parsedInput = { name: 'test', args: {}, hasArg: jest.fn() } as any;

      const result = registry.reconstructCommandText(parsedInput);

      expect(mockHandler.reconstructCommandText).toHaveBeenCalledWith(parsedInput);
      expect(result).toBe('test --arg1=value');
    });

    it('should call syncState on handler', () => {
      const parsedInput = { name: 'test', args: {}, hasArg: jest.fn() } as any;
      const enteredCommand = {} as any;

      registry.syncState(parsedInput, enteredCommand);

      expect(mockHandler.syncState).toHaveBeenCalledWith(parsedInput, enteredCommand);
    });

    it('should not call methods on handler if handler does not exist', () => {
      const parsedInput = { name: 'unknown', args: {}, hasArg: jest.fn() } as any;
      const enteredCommand = {} as any;

      registry.initializeArgState(parsedInput, enteredCommand);
      registry.syncState(parsedInput, enteredCommand);
      const result = registry.reconstructCommandText(parsedInput);

      expect(result).toBeUndefined();
    });
  });
});
