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
    it('should return empty string arguments array for file selector functionality', () => {
      expect(handler.getEmptyStringArguments()).toEqual([]);
    });
  });

  describe('reconstructCommandText', () => {
    it('should reconstruct command text with arguments', () => {
      const parsedInput = {
        name: 'upload',
        args: {
          file: ['test.txt'],
          path: ['/tmp/test.txt'],
          overwrite: [true],
        },
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;

      const result = handler.reconstructCommandText(parsedInput);

      expect(result).toEqual({ parsedInput });
    });

    it('should handle values with spaces by adding quotes', () => {
      const parsedInput = {
        name: 'upload',
        args: {
          file: ['test file.txt'],
          path: ['/tmp/test file.txt'],
        },
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;

      const result = handler.reconstructCommandText(parsedInput);

      expect(result).toEqual({ parsedInput });
    });

    it('should handle empty string values with quotes', () => {
      const parsedInput = {
        name: 'upload',
        args: {
          file: [''],
          description: [''],
        },
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;

      const result = handler.reconstructCommandText(parsedInput);

      expect(result).toEqual({ parsedInput });
    });
  });

  describe('syncState', () => {
    it('should sync selector values to parsed input', () => {
      const parsedInput = {
        name: 'upload',
        args: {
          file: ['old.txt'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      } as unknown as ParsedCommandInterface;

      const enteredCommand = {
        commandDefinition: {},
        argsWithValueSelectors: {
          file: {},
        },
        argState: {
          file: [{ value: 'new.txt', valueText: 'new.txt' }],
        },
      } as unknown as EnteredCommand;

      handler.syncState(parsedInput, enteredCommand);

      expect(parsedInput.args.file).toEqual(['new.txt']);
    });

    it('should handle multiple selector values', () => {
      const parsedInput = {
        name: 'upload',
        args: {
          file: ['old.txt'],
          path: ['old-path'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      } as unknown as ParsedCommandInterface;

      const enteredCommand = {
        commandDefinition: {},
        argsWithValueSelectors: {
          file: {},
          path: {},
        },
        argState: {
          file: [{ value: 'new.txt', valueText: 'new.txt' }],
          path: [{ value: 'new-path', valueText: 'new-path' }],
        },
      } as unknown as EnteredCommand;

      handler.syncState(parsedInput, enteredCommand);

      expect(parsedInput.args.file).toEqual(['new.txt']);
      expect(parsedInput.args.path).toEqual(['new-path']);
    });

    it('should handle enteredCommand without argsWithValueSelectors', () => {
      const parsedInput = {
        name: 'upload',
        args: {},
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;

      const enteredCommand = {
        commandDefinition: {},
        argsWithValueSelectors: undefined,
        argState: {},
      } as unknown as EnteredCommand;

      expect(() => handler.syncState(parsedInput, enteredCommand)).not.toThrow();
    });
  });
});
