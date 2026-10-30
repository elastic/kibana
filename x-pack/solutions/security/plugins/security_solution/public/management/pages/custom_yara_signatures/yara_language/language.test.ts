/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import { registerYaraLanguage, YARA_LANG_ID } from '.';
import { buildYaraTheme } from './theme';
import {
  BUILT_IN_KEYWORDS,
  CONSTANT_KEYWORDS,
  DECLARATION_KEYWORDS,
  OPERATOR_KEYWORDS,
  QUANTIFIER_KEYWORDS,
  SECTION_KEYWORDS,
  STRING_MODIFIERS,
} from './keywords';

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

  it('should register the theme', () => {
    expect(monaco.editor.getLanguageThemeResolver(YARA_LANG_ID)).toBe(buildYaraTheme);
  });

  it('should tokenize identifiers and whitespace', () => {
    expect(tokenize('foo bar\n  baz')).toEqual([
      [
        ['foo', 'identifier'],
        [' ', 'white'],
        ['bar', 'identifier'],
      ],
      [
        ['  ', 'white'],
        ['baz', 'identifier'],
      ],
    ]);
  });

  describe('comments', () => {
    it('should tokenize a line comment', () => {
      expect(tokenize('// a comment')).toEqual([[['// a comment', 'comment']]]);
    });

    it('should tokenize a line comment after code', () => {
      expect(tokenize('foo bar // comment')).toEqual([
        [
          ['foo', 'identifier'],
          [' ', 'white'],
          ['bar', 'identifier'],
          [' ', 'white'],
          ['// comment', 'comment'],
        ],
      ]);
    });

    it('should not start a block comment inside a line comment', () => {
      expect(tokenize('// a /* b\nfoo')).toEqual([
        [['// a /* b', 'comment']],
        [['foo', 'identifier']],
      ]);
    });

    it('should tokenize an inline block comment', () => {
      expect(tokenize('foo /* comment */ bar')).toEqual([
        [
          ['foo', 'identifier'],
          [' ', 'white'],
          ['/* comment */', 'comment'],
          [' ', 'white'],
          ['bar', 'identifier'],
        ],
      ]);
    });

    it('should tokenize a block comment spanning multiple lines', () => {
      expect(tokenize('/*\n  rule a // b\n*/ foo')).toEqual([
        [['/*', 'comment']],
        [['  rule a // b', 'comment']],
        [
          ['*/', 'comment'],
          [' ', 'white'],
          ['foo', 'identifier'],
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
      expect(tokenize('// "\nfoo')).toEqual([[['// "', 'comment']], [['foo', 'identifier']]]);
    });
  });

  describe('text strings', () => {
    it('should tokenize a text string', () => {
      expect(tokenize('import "pe"')).toEqual([
        [
          ['import', 'keyword'],
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
      expect(tokenize('"abc\nfoo')).toEqual([
        [['"abc', 'string.invalid']],
        [['foo', 'identifier']],
      ]);
    });

    it('should mark an unterminated string ending with a backslash as invalid', () => {
      expect(tokenize('"abc\\\nfoo')).toEqual([
        [['"abc\\', 'string.invalid']],
        [['foo', 'identifier']],
      ]);
    });
  });

  describe('regular expressions', () => {
    it('should tokenize a regular expression', () => {
      expect(tokenize('/md5: [0-9a-fA-F]{32}/')).toEqual([[['/md5: [0-9a-fA-F]{32}/', 'regexp']]]);
    });

    it.each(['i', 's', 'is'])('should tokenize the `%s` flags', (flags) => {
      expect(tokenize(`/foo/${flags}`)).toEqual([[[`/foo/${flags}`, 'regexp']]]);
    });

    it('should accept the flags only in `is` order', () => {
      expect(tokenize('/foo/si')).toEqual([
        [
          ['/foo/s', 'regexp'],
          ['i', 'identifier'],
        ],
      ]);
    });

    it('should tokenize escape sequences', () => {
      expect(tokenize(String.raw`/a\/b\d\x41c/`)).toEqual([
        [
          ['/a', 'regexp'],
          ['\\/', 'regexp.escape'],
          ['b', 'regexp'],
          ['\\d\\x41', 'regexp.escape'],
          ['c/', 'regexp'],
        ],
      ]);
    });

    it('should tokenize an escaped slash inside a character class', () => {
      expect(tokenize(String.raw`/[\/]/`)).toEqual([
        [
          ['/[', 'regexp'],
          ['\\/', 'regexp.escape'],
          [']/', 'regexp'],
        ],
      ]);
    });

    it('should not tokenize strings and comments inside a regular expression', () => {
      expect(tokenize('/"a" *b/')).toEqual([[['/"a" *b/', 'regexp']]]);
    });

    it('should return to normal tokenization after the regular expression', () => {
      expect(tokenize('/a/ b')).toEqual([
        [
          ['/a/', 'regexp'],
          [' ', 'white'],
          ['b', 'identifier'],
        ],
      ]);
    });

    it('should mark an unterminated regular expression as invalid until the end of the line', () => {
      expect(tokenize('/abc\nfoo')).toEqual([
        [['/abc', 'regexp.invalid']],
        [['foo', 'identifier']],
      ]);
    });

    it('should mark an unterminated regular expression ending with a backslash as invalid', () => {
      expect(tokenize('/abc\\\nfoo')).toEqual([
        [['/abc\\', 'regexp.invalid']],
        [['foo', 'identifier']],
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

    it('should tokenize a hex string opened on the line after `=`', () => {
      expect(tokenize('a =\n  { ?? E2 }')).toEqual([
        [
          ['a', 'identifier'],
          [' ', 'white'],
          ['=', 'operator'],
        ],
        [
          ['  ', 'white'],
          ['{', 'delimiter.curly'],
          [' ', 'white'],
          ['??', 'number.hex'],
          [' ', 'white'],
          ['E2', 'number.hex'],
          [' ', 'white'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should tokenize a hex string after comments following `=`', () => {
      expect(tokenize('= /* a */ // b\n{ E2 }')).toEqual([
        [
          ['=', 'operator'],
          [' ', 'white'],
          ['/* a */', 'comment'],
          [' ', 'white'],
          ['// b', 'comment'],
        ],
        [
          ['{', 'delimiter.curly'],
          [' ', 'white'],
          ['E2', 'number.hex'],
          [' ', 'white'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it.each([
      ['a text string', '"E2"', [['"E2"', 'string']]],
      ['a regular expression', '/E2/', [['/E2/', 'regexp']]],
      ['a number', '2', [['2', 'number']]],
    ])('should tokenize %s on the line after `=` normally', (_, value, valueTokens) => {
      expect(tokenize(`=\n${value}`)).toEqual([[['=', 'operator']], valueTokens]);
    });

    it('should not tokenize a hex string after `==`', () => {
      expect(tokenize('== { E2 }')).toEqual([
        [
          ['==', 'operator'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
          [' ', 'white'],
          ['E2', 'identifier'],
          [' ', 'white'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should not tokenize a rule body as a hex string', () => {
      expect(tokenize('rule a { E2 }')).toEqual([
        [
          ['rule', 'keyword'],
          [' ', 'white'],
          ['a', 'type'],
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

  describe('keywords', () => {
    it.each<[string, string]>([
      ...[
        ...DECLARATION_KEYWORDS.filter((keyword) => keyword !== 'rule'),
        ...SECTION_KEYWORDS,
        ...OPERATOR_KEYWORDS,
        ...QUANTIFIER_KEYWORDS,
      ].map((keyword): [string, string] => [keyword, 'keyword']),
      ...STRING_MODIFIERS.filter((modifier) => modifier !== 'private').map(
        (modifier): [string, string] => [modifier, 'keyword.modifier']
      ),
      ...CONSTANT_KEYWORDS.map((constant): [string, string] => [constant, 'constant']),
      ...BUILT_IN_KEYWORDS.map((builtIn): [string, string] => [builtIn, 'variable.predefined']),
    ])('should tokenize `%s` as %s', (keyword, type) => {
      expect(tokenize(keyword)).toEqual([[[keyword, type]]]);
    });

    it('should tokenize `private` as a keyword, although it is a string modifier as well', () => {
      expect(tokenize('private')).toEqual([[['private', 'keyword']]]);
    });

    it.each(['rules', 'nocase_a', 'true1', 'Rule', 'TRUE'])(
      'should tokenize `%s` as an identifier',
      (identifier) => {
        expect(tokenize(identifier)).toEqual([[[identifier, 'identifier']]]);
      }
    );
  });

  describe('rule headers', () => {
    it('should tokenize modifiers, rule name and tags', () => {
      expect(tokenize('private global rule Foo : Bar baz_1 {')).toEqual([
        [
          ['private', 'keyword'],
          [' ', 'white'],
          ['global', 'keyword'],
          [' ', 'white'],
          ['rule', 'keyword'],
          [' ', 'white'],
          ['Foo', 'type'],
          [' ', 'white'],
          [':', 'delimiter'],
          [' ', 'white'],
          ['Bar', 'tag'],
          [' ', 'white'],
          ['baz_1', 'tag'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
        ],
      ]);
    });

    it('should tokenize a rule header without whitespace', () => {
      expect(tokenize('rule a:b{')).toEqual([
        [
          ['rule', 'keyword'],
          [' ', 'white'],
          ['a', 'type'],
          [':', 'delimiter'],
          ['b', 'tag'],
          ['{', 'delimiter.curly'],
        ],
      ]);
    });

    it('should tokenize a rule header spanning multiple lines with comments', () => {
      expect(tokenize('rule /* c */\n  Foo // c\n  : Bar\n{')).toEqual([
        [
          ['rule', 'keyword'],
          [' ', 'white'],
          ['/* c */', 'comment'],
        ],
        [
          ['  ', 'white'],
          ['Foo', 'type'],
          [' ', 'white'],
          ['// c', 'comment'],
        ],
        [
          ['  ', 'white'],
          [':', 'delimiter'],
          [' ', 'white'],
          ['Bar', 'tag'],
        ],
        [['{', 'delimiter.curly']],
      ]);
    });

    it('should tokenize the rule body normally after the header', () => {
      expect(tokenize('rule a { true }')).toEqual([
        [
          ['rule', 'keyword'],
          [' ', 'white'],
          ['a', 'type'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
          [' ', 'white'],
          ['true', 'constant'],
          [' ', 'white'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });

    it('should return to normal tokenization after the tags', () => {
      expect(tokenize('rule a : b {')).toEqual([
        [
          ['rule', 'keyword'],
          [' ', 'white'],
          ['a', 'type'],
          [' ', 'white'],
          [':', 'delimiter'],
          [' ', 'white'],
          ['b', 'tag'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
        ],
      ]);
    });

    it('should return to normal tokenization when the rule name is missing', () => {
      expect(tokenize('rule { true }')).toEqual([
        [
          ['rule', 'keyword'],
          [' ', 'white'],
          ['{', 'delimiter.curly'],
          [' ', 'white'],
          ['true', 'constant'],
          [' ', 'white'],
          ['}', 'delimiter.curly'],
        ],
      ]);
    });
  });

  describe('string references', () => {
    it.each(['$a', '$a_1', '$1', '$', '$a*', '$*', '#a', '#', '@a', '@', '!a', '!'])(
      'should tokenize `%s` as a variable',
      (reference) => {
        expect(tokenize(reference)).toEqual([[[reference, 'variable']]]);
      }
    );

    it('should tokenize string offsets with an index', () => {
      expect(tokenize('@a[1]')).toEqual([
        [
          ['@a', 'variable'],
          ['[', 'delimiter.square'],
          ['1', 'number'],
          [']', 'delimiter.square'],
        ],
      ]);
    });

    it('should tokenize `!=` as an operator instead of a string length', () => {
      expect(tokenize('!a!=!b')).toEqual([
        [
          ['!a', 'variable'],
          ['!=', 'operator'],
          ['!b', 'variable'],
        ],
      ]);
    });

    it('should tokenize the wildcard only for `$` references', () => {
      expect(tokenize('#a*2')).toEqual([
        [
          ['#a', 'variable'],
          ['*', 'operator'],
          ['2', 'number'],
        ],
      ]);
    });
  });

  describe('numbers', () => {
    it.each([
      ['100', 'number'],
      ['200KB', 'number'],
      ['2MB', 'number'],
      ['0x5A4D', 'number.hex'],
      ['7.5', 'number.float'],
    ])('should tokenize `%s` as %s', (number, type) => {
      expect(tokenize(number)).toEqual([[[number, type]]]);
    });

    it('should tokenize a range', () => {
      expect(tokenize('(0..filesize-1)')).toEqual([
        [
          ['(', 'delimiter.parenthesis'],
          ['0', 'number'],
          ['..', 'operator'],
          ['filesize', 'variable.predefined'],
          ['-', 'operator'],
          ['1', 'number'],
          [')', 'delimiter.parenthesis'],
        ],
      ]);
    });
  });

  describe('operators and delimiters', () => {
    it.each([
      '..',
      '<<',
      '>>',
      '<=',
      '>=',
      '==',
      '!=',
      '<',
      '>',
      '=',
      '+',
      '-',
      '*',
      '\\',
      '%',
      '&',
      '|',
      '^',
      '~',
    ])('should tokenize `%s` as an operator', (operator) => {
      expect(tokenize(operator)).toEqual([[[operator, 'operator']]]);
    });

    it('should tokenize member access', () => {
      expect(tokenize('pe.entry_point')).toEqual([
        [
          ['pe', 'identifier'],
          ['.', 'delimiter'],
          ['entry_point', 'identifier'],
        ],
      ]);
    });

    it('should tokenize sets', () => {
      expect(tokenize('($a,$b*)')).toEqual([
        [
          ['(', 'delimiter.parenthesis'],
          ['$a', 'variable'],
          [',', 'delimiter'],
          ['$b*', 'variable'],
          [')', 'delimiter.parenthesis'],
        ],
      ]);
    });

    it('should tokenize section labels', () => {
      expect(tokenize('condition:')).toEqual([
        [
          ['condition', 'keyword'],
          [':', 'delimiter'],
        ],
      ]);
    });

    it.each([';', '?', '`'])('should tokenize `%s` as invalid', (character) => {
      expect(tokenize(character)).toEqual([[[character, 'invalid']]]);
    });
  });

  it('should tokenize a complete rule', () => {
    expect(
      tokenize(
        [
          'import "pe"',
          'rule Example : tag {',
          '  meta:',
          '    author = "me"',
          '  strings:',
          '    $a = "text" nocase',
          '    $b = { E2 ?? }',
          '    $c = /re/i',
          '  condition:',
          '    #a > 2 and $b at pe.entry_point and filesize < 2MB',
          '}',
        ].join('\n')
      )
    ).toEqual([
      [
        ['import', 'keyword'],
        [' ', 'white'],
        ['"pe"', 'string'],
      ],
      [
        ['rule', 'keyword'],
        [' ', 'white'],
        ['Example', 'type'],
        [' ', 'white'],
        [':', 'delimiter'],
        [' ', 'white'],
        ['tag', 'tag'],
        [' ', 'white'],
        ['{', 'delimiter.curly'],
      ],
      [
        ['  ', 'white'],
        ['meta', 'keyword'],
        [':', 'delimiter'],
      ],
      [
        ['    ', 'white'],
        ['author', 'identifier'],
        [' ', 'white'],
        ['=', 'operator'],
        [' ', 'white'],
        ['"me"', 'string'],
      ],
      [
        ['  ', 'white'],
        ['strings', 'keyword'],
        [':', 'delimiter'],
      ],
      [
        ['    ', 'white'],
        ['$a', 'variable'],
        [' ', 'white'],
        ['=', 'operator'],
        [' ', 'white'],
        ['"text"', 'string'],
        [' ', 'white'],
        ['nocase', 'keyword.modifier'],
      ],
      [
        ['    ', 'white'],
        ['$b', 'variable'],
        [' ', 'white'],
        ['=', 'operator'],
        [' ', 'white'],
        ['{', 'delimiter.curly'],
        [' ', 'white'],
        ['E2', 'number.hex'],
        [' ', 'white'],
        ['??', 'number.hex'],
        [' ', 'white'],
        ['}', 'delimiter.curly'],
      ],
      [
        ['    ', 'white'],
        ['$c', 'variable'],
        [' ', 'white'],
        ['=', 'operator'],
        [' ', 'white'],
        ['/re/i', 'regexp'],
      ],
      [
        ['  ', 'white'],
        ['condition', 'keyword'],
        [':', 'delimiter'],
      ],
      [
        ['    ', 'white'],
        ['#a', 'variable'],
        [' ', 'white'],
        ['>', 'operator'],
        [' ', 'white'],
        ['2', 'number'],
        [' ', 'white'],
        ['and', 'keyword'],
        [' ', 'white'],
        ['$b', 'variable'],
        [' ', 'white'],
        ['at', 'keyword'],
        [' ', 'white'],
        ['pe', 'identifier'],
        ['.', 'delimiter'],
        ['entry_point', 'identifier'],
        [' ', 'white'],
        ['and', 'keyword'],
        [' ', 'white'],
        ['filesize', 'variable.predefined'],
        [' ', 'white'],
        ['<', 'operator'],
        [' ', 'white'],
        ['2MB', 'number'],
      ],
      [['}', 'delimiter.curly']],
    ]);
  });
});
