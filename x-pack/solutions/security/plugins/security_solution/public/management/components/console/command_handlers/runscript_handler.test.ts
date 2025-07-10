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

  describe('reconstructCommandText', () => {
    it('should reconstruct command text with arguments', () => {
      const parsedInput = {
        name: 'runscript',
        args: {
          ScriptName: ['test.sh'],
          CloudFile: ['cloud.sh'],
          param: ['value'],
        },
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;

      const result = handler.reconstructCommandText(parsedInput);

      expect(result.leftOfCursorText).toBe(
        'runscript --ScriptName="test.sh" --CloudFile="cloud.sh" --param="value"'
      );
    });

    it('should handle values with spaces by adding quotes', () => {
      const parsedInput = {
        name: 'runscript',
        args: {
          ScriptName: ['test script.sh'],
          param: ['value with spaces'],
        },
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;

      const result = handler.reconstructCommandText(parsedInput);

      expect(result.leftOfCursorText).toBe(
        'runscript --ScriptName="test script.sh" --param="value with spaces"'
      );
    });

    it('should handle boolean arguments', () => {
      const parsedInput = {
        name: 'runscript',
        args: {
          ScriptName: ['test.sh'],
          verbose: [true],
        },
        hasArg: jest.fn(),
      } as unknown as ParsedCommandInterface;

      const result = handler.reconstructCommandText(parsedInput);

      expect(result.leftOfCursorText).toBe('runscript --ScriptName="test.sh" --verbose');
    });
  });

  describe('syncState', () => {
    it('should sync selector values to parsed input', () => {
      const parsedInput = {
        name: 'runscript',
        args: {
          ScriptName: ['old.sh'],
        },
        hasArg: jest.fn((argName) => argName in parsedInput.args),
      } as unknown as ParsedCommandInterface;

      const enteredCommand = {
        commandDefinition: {},
        argsWithValueSelectors: {
          ScriptName: {},
        },
        argState: {
          ScriptName: [{ value: 'new.sh', valueText: 'new.sh' }],
        },
      } as unknown as EnteredCommand;

      handler.syncState(parsedInput, enteredCommand);

      expect(parsedInput.args.ScriptName).toEqual(['new.sh']);
    });

    it('should handle enteredCommand without argsWithValueSelectors', () => {
      const parsedInput = {
        name: 'runscript',
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
