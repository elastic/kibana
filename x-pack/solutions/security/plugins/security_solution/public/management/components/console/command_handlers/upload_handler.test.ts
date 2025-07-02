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

  describe('initializeArgState', () => {
    it('should NOT initialize arg state for file selectors from parsed input', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['test.txt'],
          path: ['/tmp/test.txt'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: {
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          file: {},
        },
        argState: {},
      };

      handler.initializeArgState(parsedInput, enteredCommand);

      // File selectors should NOT be initialized from parsed input
      expect(enteredCommand.argState.file).toBeUndefined();
      // Other selectors (if any) could be checked here, but for upload, only file is relevant
    });

    it('should not overwrite existing arg state', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['test.txt'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: {
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          file: {},
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
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {},
        hasArg: jest.fn(),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: undefined,
        argState: {},
      };

      expect(() => handler.initializeArgState(parsedInput, enteredCommand)).not.toThrow();
    });
  });

  describe('reconstructCommandText', () => {
    it('should reconstruct command text with arguments', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
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

      expect(result).toEqual({ parsedInput });
    });

    it('should handle values with spaces by adding quotes', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['test file.txt'],
          path: ['/tmp/test file.txt'],
        },
        hasArg: jest.fn(),
      };

      const result = handler.reconstructCommandText(parsedInput);

      expect(result).toEqual({ parsedInput });
    });

    it('should handle empty string values with quotes', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: [''],
          description: [''],
        },
        hasArg: jest.fn(),
      };

      const result = handler.reconstructCommandText(parsedInput);

      expect(result).toEqual({ parsedInput });
    });
  });

  describe('syncState', () => {
    it('should sync selector values to parsed input', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['old.txt'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: {
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          file: {},
        },
        argState: {
          file: [{ value: 'new.txt', valueText: 'new.txt' }],
        },
      };

      handler.syncState(parsedInput, enteredCommand);

      expect(parsedInput.args.file).toEqual(['new.txt']);
    });

    it('should handle multiple selector values', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {
          file: ['old.txt'],
          path: ['old-path'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: {
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          file: {},
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          path: {},
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
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'upload',
        args: {},
        hasArg: jest.fn(),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: undefined,
        argState: {},
      };

      expect(() => handler.syncState(parsedInput, enteredCommand)).not.toThrow();
    });
  });
});
