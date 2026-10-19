/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import { registerYaraLanguage, YARA_LANG_ID } from '.';

type TokenTuple = [text: string, type: string];

/** Tokenizes `text` into `[text, type]` tuples per line, with the `.yara` postfix removed. */
const tokenize = (text: string): TokenTuple[][] => {
  const lines = text.split('\n');

  return monaco.editor
    .tokenize(text, YARA_LANG_ID)
    .map((lineTokens, lineIndex) =>
      lineTokens.map(
        ({ offset, type }, tokenIndex): TokenTuple => [
          lines[lineIndex].slice(offset, lineTokens[tokenIndex + 1]?.offset),
          type.replace(/\.yara$/, ''),
        ]
      )
    );
};

describe('YARA language', () => {
  beforeAll(() => {
    registerYaraLanguage();

    // Instantiating a model triggers the `onLanguage` callback that sets up the tokenizer.
    monaco.editor.createModel('', YARA_LANG_ID).dispose();
  });

  it('should register the language only once', () => {
    registerYaraLanguage();

    expect(monaco.languages.getLanguages().filter(({ id }) => id === YARA_LANG_ID)).toHaveLength(1);
  });

  it('should tokenize identifiers and whitespace', () => {
    expect(tokenize('rule dummy\n  condition')).toEqual([
      [
        ['rule', 'identifier'],
        [' ', 'white'],
        ['dummy', 'identifier'],
      ],
      [
        ['  ', 'white'],
        ['condition', 'identifier'],
      ],
    ]);
  });

  describe('comments', () => {
    it('should tokenize a line comment', () => {
      expect(tokenize('// a comment')).toEqual([[['// a comment', 'comment']]]);
    });

    it('should tokenize a line comment after code', () => {
      expect(tokenize('rule a // comment')).toEqual([
        [
          ['rule', 'identifier'],
          [' ', 'white'],
          ['a', 'identifier'],
          [' ', 'white'],
          ['// comment', 'comment'],
        ],
      ]);
    });

    it('should not start a block comment inside a line comment', () => {
      expect(tokenize('// a /* b\nrule')).toEqual([
        [['// a /* b', 'comment']],
        [['rule', 'identifier']],
      ]);
    });

    it('should tokenize an inline block comment', () => {
      expect(tokenize('rule /* comment */ a')).toEqual([
        [
          ['rule', 'identifier'],
          [' ', 'white'],
          ['/* comment */', 'comment'],
          [' ', 'white'],
          ['a', 'identifier'],
        ],
      ]);
    });

    it('should tokenize a block comment spanning multiple lines', () => {
      expect(tokenize('/*\n  rule a // b\n*/ rule')).toEqual([
        [['/*', 'comment']],
        [['  rule a // b', 'comment']],
        [
          ['*/', 'comment'],
          [' ', 'white'],
          ['rule', 'identifier'],
        ],
      ]);
    });

    it('should not nest block comments', () => {
      expect(tokenize('/* a /* b */ c')).toEqual([
        [
          ['/* a /* b */', 'comment'],
          [' ', 'white'],
          ['c', 'identifier'],
        ],
      ]);
    });

    it('should keep `*` and `/` inside a block comment', () => {
      expect(tokenize('/* a * b / c */')).toEqual([[['/* a * b / c */', 'comment']]]);
    });

    it('should not start a string inside a comment', () => {
      expect(tokenize('// "\nrule')).toEqual([[['// "', 'comment']], [['rule', 'identifier']]]);
    });
  });

  describe('text strings', () => {
    it('should tokenize a text string', () => {
      expect(tokenize('import "pe"')).toEqual([
        [
          ['import', 'identifier'],
          [' ', 'white'],
          ['"pe"', 'string'],
        ],
      ]);
    });

    it('should tokenize valid escape sequences', () => {
      expect(tokenize(String.raw`"a\"b\\c\r\t\n\x4F"`)).toEqual([
        [
          ['"a', 'string'],
          ['\\"', 'string.escape'],
          ['b', 'string'],
          ['\\\\', 'string.escape'],
          ['c', 'string'],
          ['\\r\\t\\n\\x4F', 'string.escape'],
          ['"', 'string'],
        ],
      ]);
    });

    it('should tokenize invalid escape sequences', () => {
      expect(tokenize('"\\q\\x4G"')).toEqual([
        [
          ['"', 'string'],
          ['\\q\\x', 'string.escape.invalid'],
          ['4G"', 'string'],
        ],
      ]);
    });

    it('should not tokenize comments inside a string', () => {
      expect(tokenize('"// not /* a comment */"')).toEqual([
        [['"// not /* a comment */"', 'string']],
      ]);
    });

    it('should mark an unterminated string as invalid until the end of the line', () => {
      expect(tokenize('"abc\nrule')).toEqual([
        [['"abc', 'string.invalid']],
        [['rule', 'identifier']],
      ]);
    });

    it('should mark an unterminated string ending with a backslash as invalid', () => {
      expect(tokenize('"abc\\\nrule')).toEqual([
        [['"abc\\', 'string.invalid']],
        [['rule', 'identifier']],
      ]);
    });
  });

  describe('hex strings', () => {
    it('should tokenize a hex string', () => {
      expect(tokenize('a = { E2 34 }')).toEqual([
        [
          ['a', 'identifier'],
          [' ', 'white'],
          ['=', 'operator'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
          [' ', 'white'],
          ['E2', 'number.hex'],
          [' ', 'white'],
          ['34', 'number.hex'],
          [' ', 'white'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should tokenize contiguous bytes without whitespace around the brackets', () => {
      expect(tokenize('={E234a1}')).toEqual([
        [
          ['=', 'operator'],
          ['{', 'delimiter.curly'],
          ['E234a1', 'number.hex'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should tokenize wildcards and not operators', () => {
      expect(tokenize('= { ?? A? ?0 ~00 ~?F }')).toEqual([
        [
          ['=', 'operator'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
          [' ', 'white'],
          ['??', 'number.hex'],
          [' ', 'white'],
          ['A?', 'number.hex'],
          [' ', 'white'],
          ['?0', 'number.hex'],
          [' ', 'white'],
          ['~', 'operator'],
          ['00', 'number.hex'],
          [' ', 'white'],
          ['~', 'operator'],
          ['?F', 'number.hex'],
          [' ', 'white'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it.each([
      ['[4-6]', ['4', '-', '6']],
      ['[6]', ['6']],
      ['[10-]', ['10', '-']],
      ['[-]', ['-']],
    ])('should tokenize the %s jump', (jump, jumpContent) => {
      const contentTokens = jumpContent.map(
        (text): TokenTuple => [text, text === '-' ? 'operator' : 'number']
      );

      expect(tokenize(`={${jump}}`)).toEqual([
        [
          ['=', 'operator'],
          ['{', 'delimiter.curly'],
          ['[', 'delimiter.square'],
          ...contentTokens,
          [']', 'delimiter.square'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should tokenize whitespace inside a jump', () => {
      expect(tokenize('={[ 1 - 2 ]}')).toEqual([
        [
          ['=', 'operator'],
          ['{', 'delimiter.curly'],
          ['[', 'delimiter.square'],
          [' ', 'white'],
          ['1', 'number'],
          [' ', 'white'],
          ['-', 'operator'],
          [' ', 'white'],
          ['2', 'number'],
          [' ', 'white'],
          [']', 'delimiter.square'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should tokenize alternatives', () => {
      expect(tokenize('={F4(62B4|56)}')).toEqual([
        [
          ['=', 'operator'],
          ['{', 'delimiter.curly'],
          ['F4', 'number.hex'],
          ['(', 'delimiter.parenthesis'],
          ['62B4', 'number.hex'],
          ['|', 'operator'],
          ['56', 'number.hex'],
          [')', 'delimiter.parenthesis'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should tokenize a hex string spanning multiple lines with comments', () => {
      expect(tokenize('= {\n  E2 // c\n  /* c */ 34\n}')).toEqual([
        [
          ['=', 'operator'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
        ],
        [
          ['  ', 'white'],
          ['E2', 'number.hex'],
          [' ', 'white'],
          ['// c', 'comment'],
        ],
        [
          ['  ', 'white'],
          ['/* c */', 'comment'],
          [' ', 'white'],
          ['34', 'number.hex'],
        ],
        [['}', 'delimiter.curly']],
      ]);
    });

    it('should mark invalid characters', () => {
      expect(tokenize('={E2 GZ 3 "a"}')).toEqual([
        [
          ['=', 'operator'],
          ['{', 'delimiter.curly'],
          ['E2', 'number.hex'],
          [' ', 'white'],
          ['GZ', 'invalid'],
          [' ', 'white'],
          ['3', 'invalid'],
          [' ', 'white'],
          ['"a"', 'invalid'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should mark invalid characters inside a jump', () => {
      expect(tokenize('={[4x]}')).toEqual([
        [
          ['=', 'operator'],
          ['{', 'delimiter.curly'],
          ['[', 'delimiter.square'],
          ['4', 'number'],
          ['x', 'invalid'],
          [']', 'delimiter.square'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should return to normal tokenization after the hex string', () => {
      expect(tokenize('={E2} a')).toEqual([
        [
          ['=', 'operator'],
          ['{', 'delimiter.curly'],
          ['E2', 'number.hex'],
          ['}', 'delimiter.curly'],
          [' ', 'white'],
          ['a', 'identifier'],
        ],
      ]);
    });

    it('should not tokenize a rule body as a hex string', () => {
      expect(tokenize('rule a { E2 }')).toEqual([
        [
          ['rule', 'identifier'],
          [' ', 'white'],
          ['a', 'identifier'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
          [' ', 'white'],
          ['E2', 'identifier'],
          [' ', 'white'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });
  });
});
