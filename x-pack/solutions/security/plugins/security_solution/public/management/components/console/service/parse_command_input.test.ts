/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCommandInput } from './parsed_command_input';
import type { ParsedCommandInterface } from './types';

describe('when using parsed command input utils', () => {
  describe('when using parseCommandInput()', () => {
    const parsedCommandWith = (
      overrides: Partial<Omit<ParsedCommandInterface, 'hasArg' | 'hasArgs'>> = {}
    ): ParsedCommandInterface => {
      return {
        input: '',
        name: 'foo',
        args: {},
        params: [],
        hasArgs: Object.keys(overrides.args || {}).length > 0,
        ...overrides,
      } as unknown as ParsedCommandInterface;
    };

    it.each([
      ['foo', 'foo'],
      ['    foo', 'foo'],
      ['    foo     ', 'foo'],
      ['foo     ', 'foo'],
      [' foo-bar  ', 'foo-bar'],
    ])('should identify the command entered: [%s]', (input, expectedCommandName) => {
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          name: expectedCommandName,
          args: {},
        })
      );
    });

    it('should parse arguments that have `--` prefix with no value', () => {
      const input = 'foo    --one     --two';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: [true],
            two: [true],
          },
        })
      );
    });

    it('should parse arguments that have a single string value', () => {
      const input = 'foo --one value --two=value2';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['value'],
            two: ['value2'],
          },
        })
      );
    });

    it('should parse arguments that have multiple strings as the value', () => {
      const input = 'foo --one value for one here --two=some more strings for 2';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['value for one here'],
            two: ['some more strings for 2'],
          },
        })
      );
    });

    it('should parse arguments whose value is wrapped in quotes', () => {
      const input = 'foo --one "value for one here" --two="some more strings for 2"';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['value for one here'],
            two: ['some more strings for 2'],
          },
        })
      );
    });

    it('should parse arguments that can be used multiple times', () => {
      const input = 'foo --one 1 --one 11 --two=2 --two=22';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['1', '11'],
            two: ['2', '22'],
          },
        })
      );
    });

    it('should parse arguments whose value has `--` in it (must be escaped)', () => {
      const input = 'foo --one something \\-\\- here --two="\\-\\-something \\-\\-';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['something -- here'],
            two: ['--something --'],
          },
        })
      );
    });

    it('should parse arguments whose value has `=` in it', () => {
      const input = 'foo --one =something \\-\\- here --two="=something=something else';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['=something -- here'],
            two: ['=something=something else'],
          },
        })
      );
    });

    it.each([
      [String.raw`C:\Foo\Dir\whatever.jpg`, undefined],
      [String.raw`C:\\abc`, undefined],
      [String.raw`F:\foo\bar.docx`, undefined],
      [String.raw`C:/foo/bar.docx`, undefined],
      [String.raw`C:\\\//\/\\/\\\/abc/\/\/\///def.txt`, undefined],
      [String.raw`C:\abc~!@#$%^&*()_'+`, undefined],
      [String.raw`C:foobar`, undefined],
      [String.raw`C:\dir with spaces\foo.txt`, undefined],
      [String.raw`C:\dir\file with spaces.txt`, undefined],
      [String.raw`/tmp/linux file with spaces "and quotes" omg.txt`, undefined],
      ['c\\foo\\b\\-\\-ar.txt', String.raw`c\foo\b--ar.txt`],
      ['c:\\foo\\b \\-\\-ar.txt', String.raw`c:\foo\b --ar.txt`],
    ])('should preserve backslashes in argument values: %s', (path, expected) => {
      const input = `foo --path "${path}"`;
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand.args).toEqual({ path: [expected ?? path] });
    });

    describe('and positional (un-prefixed) parameters are entered', () => {
      it('should default `params` to an empty array when no arguments are entered', () => {
        const parsedCommand = parseCommandInput('foo');

        expect(parsedCommand.params).toEqual([]);
      });

      it('should default `params` to an empty array when only named arguments are entered', () => {
        const parsedCommand = parseCommandInput('foo --one 1 --two');

        expect(parsedCommand.params).toEqual([]);
      });

      it('should store a single un-prefixed argument in `params`', () => {
        const input = 'foo bar';
        const parsedCommand = parseCommandInput(input);

        expect(parsedCommand).toEqual(
          parsedCommandWith({
            input,
            args: {},
            params: ['bar'],
          })
        );
        expect(parsedCommand.hasArgs).toBe(false);
      });

      it('should store multiple words entered before any named argument in `params`', () => {
        const input = 'foo one two three';
        const parsedCommand = parseCommandInput(input);

        expect(parsedCommand.params).toEqual(['one two three']);
      });

      it('should capture positional params and still parse named arguments that follow', () => {
        const input = 'foo bar --one 1 --two=2';
        const parsedCommand = parseCommandInput(input);

        expect(parsedCommand).toEqual(
          parsedCommandWith({
            input,
            args: {
              one: ['1'],
              two: ['2'],
            },
            params: ['bar '],
          })
        );
        expect(parsedCommand.hasArgs).toBe(true);
      });

      it('should only capture the text prior to the first named argument as a positional param', () => {
        const parsedCommand = parseCommandInput('foo one two --one 1 three');

        expect(parsedCommand.params).toEqual(['one two ']);
      });

      it('should not populate `params` when the first argument is `--` prefixed', () => {
        const parsedCommand = parseCommandInput('foo --one value');

        expect(parsedCommand.params).toEqual([]);
      });
    });
  });
});
