/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunscriptCommandHandler } from './runscript_handler';
import type { ParsedCommandInterface } from '../service/types';
import type { EnteredCommand } from '../components/console_state/types';

describe('RunscriptCommandHandler', () => {
  let handler: RunscriptCommandHandler;

  beforeEach(() => {
    handler = new RunscriptCommandHandler();
  });

  describe('name', () => {
    it('should return "runscript"', () => {
      expect(handler.name).toBe('runscript');
    });
  });

  describe('getEmptyStringArguments', () => {
    it('should return ScriptName and CloudFile', () => {
      expect(handler.getEmptyStringArguments()).toEqual(['ScriptName', 'CloudFile']);
    });
  });

  describe('initializeArgState', () => {
    it('should initialize arg state from parsed input', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'runscript',
        args: {
          ScriptName: ['test.sh'],
          CloudFile: ['cloud.sh'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: {
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          ScriptName: {},
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          CloudFile: {},
        },
        argState: {},
      };

      handler.initializeArgState(parsedInput, enteredCommand);

      expect(enteredCommand.argState.ScriptName).toEqual([
        { value: 'test.sh', valueText: 'test.sh' },
      ]);
      expect(enteredCommand.argState.CloudFile).toEqual([
        { value: 'cloud.sh', valueText: 'cloud.sh' },
      ]);
    });

    it('should not overwrite existing arg state', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'runscript',
        args: {
          ScriptName: ['test.sh'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: {
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          ScriptName: {},
        },
        argState: {
          ScriptName: [{ value: 'existing.sh', valueText: 'existing.sh' }],
        },
      };

      handler.initializeArgState(parsedInput, enteredCommand);

      expect(enteredCommand.argState.ScriptName).toEqual([
        { value: 'existing.sh', valueText: 'existing.sh' },
      ]);
    });

    it('should handle enteredCommand without argsWithValueSelectors', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'runscript',
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
        name: 'runscript',
        args: {
          ScriptName: ['test.sh'],
          CloudFile: ['cloud.sh'],
          param: ['value'],
        },
        hasArg: jest.fn(),
      };

      const result = handler.reconstructCommandText(parsedInput);

      expect(result.leftOfCursorText).toBe(
        'runscript --ScriptName="test.sh" --CloudFile="cloud.sh" --param="value"'
      );
    });

    it('should handle values with spaces by adding quotes', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'runscript',
        args: {
          ScriptName: ['test script.sh'],
          param: ['value with spaces'],
        },
        hasArg: jest.fn(),
      };

      const result = handler.reconstructCommandText(parsedInput);

      expect(result.leftOfCursorText).toBe(
        'runscript --ScriptName="test script.sh" --param="value with spaces"'
      );
    });

    it('should handle boolean arguments', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'runscript',
        args: {
          ScriptName: ['test.sh'],
          verbose: [true],
        },
        hasArg: jest.fn(),
      };

      const result = handler.reconstructCommandText(parsedInput);

      expect(result.leftOfCursorText).toBe('runscript --ScriptName="test.sh" --verbose');
    });
  });

  describe('syncState', () => {
    it('should sync selector values to parsed input', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'runscript',
        args: {
          ScriptName: ['old.sh'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      };

      const enteredCommand: EnteredCommand = {
        // @ts-expect-error - Mock object missing required CommandDefinition properties
        commandDefinition: {},
        argsWithValueSelectors: {
          // @ts-expect-error - Mock object missing required CommandArgDefinition properties
          ScriptName: {},
        },
        argState: {
          ScriptName: [{ value: 'new.sh', valueText: 'new.sh' }],
        },
      };

      handler.syncState(parsedInput, enteredCommand);

      expect(parsedInput.args.ScriptName).toEqual(['new.sh']);
    });

    it('should handle enteredCommand without argsWithValueSelectors', () => {
      // @ts-expect-error - Mock object missing input and hasArgs properties
      const parsedInput: ParsedCommandInterface = {
        name: 'runscript',
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
