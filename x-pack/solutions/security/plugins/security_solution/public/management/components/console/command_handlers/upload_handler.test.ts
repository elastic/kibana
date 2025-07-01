/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UploadCommandHandler } from './upload_handler';
import type { ParsedCommandInterface } from '../service/types';
import type { EnteredCommand } from '../components/console_state/types';

describe('UploadCommandHandler', () => {
  let handler: UploadCommandHandler;

  beforeEach(() => {
    handler = new UploadCommandHandler();
  });

  describe('name', () => {
    it('should return "upload"', () => {
      expect(handler.name).toBe('upload');
    });
  });

  describe('getEmptyStringArguments', () => {
    it('should return file argument for file selector functionality', () => {
      expect(handler.getEmptyStringArguments()).toEqual(['file']);
    });
  });

  describe('initializeArgState', () => {
    it('should initialize arg state from parsed input', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['test.txt'],
          path: ['/tmp/test.txt'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        commandDefinition: {} as any,
        argsWithValueSelectors: {
          file: {} as any,
          path: {} as any,
        },
        argState: {},
      };

      handler.initializeArgState(parsedInput, enteredCommand);

      expect(enteredCommand.argState.file).toEqual([
        { value: 'test.txt', valueText: 'test.txt' },
      ]);
      expect(enteredCommand.argState.path).toEqual([
        { value: '/tmp/test.txt', valueText: '/tmp/test.txt' },
      ]);
    });

    it('should not overwrite existing arg state', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['test.txt'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        commandDefinition: {} as any,
        argsWithValueSelectors: {
          file: {} as any,
        },
        argState: {
          file: [{ value: 'existing.txt', valueText: 'existing.txt' }],
        },
      };

      handler.initializeArgState(parsedInput, enteredCommand);

      expect(enteredCommand.argState.file).toEqual([
        { value: 'existing.txt', valueText: 'existing.txt' },
      ]);
    });

    it('should handle enteredCommand without argsWithValueSelectors', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {},
        hasArg: jest.fn(),
      };

      const enteredCommand: EnteredCommand = {
        commandDefinition: {} as any,
        argsWithValueSelectors: undefined,
        argState: {},
      };

      expect(() => handler.initializeArgState(parsedInput, enteredCommand)).not.toThrow();
    });
  });

  describe('reconstructCommandText', () => {
    it('should reconstruct command text with arguments', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['test.txt'],
          path: ['/tmp/test.txt'],
          overwrite: [true],
        },
        hasArg: jest.fn(),
      };

      const result = handler.reconstructCommandText(parsedInput);

      expect(result).toBe('upload --file=test.txt --path=/tmp/test.txt --overwrite');
    });

    it('should handle values with spaces by adding quotes', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['test file.txt'],
          path: ['/tmp/test file.txt'],
        },
        hasArg: jest.fn(),
      };

      const result = handler.reconstructCommandText(parsedInput);

      expect(result).toBe('upload --file="test file.txt" --path="/tmp/test file.txt"');
    });

    it('should handle empty string values with quotes', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: [''],
          description: [''],
        },
        hasArg: jest.fn(),
      };

      const result = handler.reconstructCommandText(parsedInput);

      expect(result).toBe('upload --file="" --description=""');
    });
  });

  describe('syncState', () => {
    it('should sync selector values to parsed input', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['old.txt'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        commandDefinition: {} as any,
        argsWithValueSelectors: {
          file: {} as any,
        },
        argState: {
          file: [{ value: 'new.txt', valueText: 'new.txt' }],
        },
      };

      handler.syncState(parsedInput, enteredCommand);

      expect(parsedInput.args.file).toEqual(['new.txt']);
    });

    it('should handle multiple selector values', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['old.txt'],
          path: ['old-path'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        commandDefinition: {} as any,
        argsWithValueSelectors: {
          file: {} as any,
          path: {} as any,
        },
        argState: {
          file: [{ value: 'new.txt', valueText: 'new.txt' }],
          path: [{ value: 'new-path', valueText: 'new-path' }],
        },
      };

      handler.syncState(parsedInput, enteredCommand);

      expect(parsedInput.args.file).toEqual(['new.txt']);
      expect(parsedInput.args.path).toEqual(['new-path']);
    });

    it('should handle enteredCommand without argsWithValueSelectors', () => {
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {},
        hasArg: jest.fn(),
      };

      const enteredCommand: EnteredCommand = {
        commandDefinition: {} as any,
        argsWithValueSelectors: undefined,
        argState: {},
      };

      expect(() => handler.syncState(parsedInput, enteredCommand)).not.toThrow();
    });
  });
});
