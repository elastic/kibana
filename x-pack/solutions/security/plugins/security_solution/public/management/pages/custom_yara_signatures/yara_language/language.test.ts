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
});
