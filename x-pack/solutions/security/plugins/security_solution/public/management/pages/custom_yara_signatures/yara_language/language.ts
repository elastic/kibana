/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';
import {
  BUILT_IN_KEYWORDS,
  CONSTANT_KEYWORDS,
  DECLARATION_KEYWORDS,
  OPERATOR_KEYWORDS,
  QUANTIFIER_KEYWORDS,
  SECTION_KEYWORDS,
  STRING_MODIFIERS,
} from './keywords';

export const languageConfiguration: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },

  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],

  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string', 'comment'] },
  ],

  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
};

/**
 * Monarch tokenizer for YARA rules, see https://yara.readthedocs.io/en/stable/writingrules.html
 * and https://microsoft.github.io/monaco-editor/monarch.html
 */
export const lexerRules: monaco.languages.IMonarchLanguage = {
  defaultToken: 'invalid',

  keywords: [
    ...DECLARATION_KEYWORDS,
    ...SECTION_KEYWORDS,
    ...OPERATOR_KEYWORDS,
    ...QUANTIFIER_KEYWORDS,
  ],
  stringModifiers: [...STRING_MODIFIERS],
  constants: [...CONSTANT_KEYWORDS],
  builtIns: [...BUILT_IN_KEYWORDS],

  stringEscapes: /\\(?:["\\rtn]|x[0-9a-fA-F]{2})/,
  regexpEscapes: /\\(?:x[0-9a-fA-F]{2}|.)/,
  // Multi-character operators come first, so e.g. `!=` is not tokenized as the `!` string length prefix.
  operators: /\.\.|<<|>>|<=|>=|==|!=|[<>=+\-*\\%&|^~]/,

  tokenizer: {
    root: [
      { include: '@whitespace' },

      // Text strings cannot span multiple lines, so an unterminated one is invalid until the end of the line.
      [/"(?:[^"\\]|\\.)*\\?$/, 'string.invalid'],
      [/"/, 'string', '@string'],

      // Same for regular expressions. Comments are matched before, so `//` and `/*` never start one.
      [/\/(?:[^\\/]|\\.)*\\?$/, 'regexp.invalid'],
      [/\//, 'regexp', '@regexp'],

      // A curly bracket after `=` opens a hex string, otherwise it delimits a rule body.
      [/=(?!=)/, 'operator', '@assignedValue'],
      [/[{}]/, 'delimiter.curly'],

      [/@operators/, 'operator'],
      [/[()]/, 'delimiter.parenthesis'],
      [/[[\]]/, 'delimiter.square'],
      [/[,:.]/, 'delimiter'],

      // String references, the bare prefixes are used inside `for..of` loops.
      [/\$\w*\*?/, 'variable'],
      [/[#@!]\w*/, 'variable'],

      // The `KB` and `MB` suffixes are only allowed for decimal integers.
      [/0x[0-9a-fA-F]+/, 'number.hex'],
      [/\d+\.\d+/, 'number.float'],
      [/\d+(?:KB|MB)?/, 'number'],

      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            rule: { token: 'keyword', next: '@ruleName' },
            // `private` is both a rule and a string modifier, `@keywords` takes precedence.
            '@keywords': 'keyword',
            '@stringModifiers': 'keyword.modifier',
            '@constants': 'constant',
            '@builtIns': 'variable.predefined',
            '@default': 'identifier',
          },
        },
      ],
    ],

    // `rule <name> : <tag> <tag>`, anything else returns to `root`, e.g. the `{` of the rule body.
    ruleName: [
      { include: '@whitespace' },
      [/[a-zA-Z_]\w*/, { token: 'type', switchTo: '@ruleTagsSeparator' }],
      [/./, { token: '@rematch', next: '@pop' }],
    ],

    ruleTagsSeparator: [
      { include: '@whitespace' },
      [/:/, { token: 'delimiter', switchTo: '@ruleTags' }],
      [/./, { token: '@rematch', next: '@pop' }],
    ],

    ruleTags: [
      { include: '@whitespace' },
      [/[a-zA-Z_]\w*/, 'tag'],
      [/./, { token: '@rematch', next: '@pop' }],
    ],

    // The value after `=` can start on a later line, and comments can precede it.
    assignedValue: [
      { include: '@whitespace' },
      [/\{/, { token: 'delimiter.curly', switchTo: '@hexString' }],
      [/./, { token: '@rematch', next: '@pop' }],
    ],

    whitespace: [
      [/\s+/, 'white'],
      [/\/\*/, 'comment', '@blockComment'],
      [/\/\/.*$/, 'comment'],
    ],

    // Block comments do not nest, so an inner `/*` is part of the comment.
    blockComment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/@stringEscapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    // As in YARA's lexer, an unescaped `/` ends the regular expression even inside a character class.
    regexp: [
      [/[^\\/]+/, 'regexp'],
      [/@regexpEscapes/, 'regexp.escape'],
      [/\/i?s?/, 'regexp', '@pop'],
    ],

    hexString: [
      { include: '@whitespace' },
      [/[0-9a-fA-F?]{2}/, 'number.hex'],
      [/[~|]/, 'operator'],
      [/[()]/, 'delimiter.parenthesis'],
      [/\[/, 'delimiter.square', '@hexJump'],
      [/\}/, 'delimiter.curly', '@pop'],
      [/./, 'invalid'],
    ],

    hexJump: [
      [/\s+/, 'white'],
      [/\d+/, 'number'],
      [/-/, 'operator'],
      [/\]/, 'delimiter.square', '@pop'],
      [/./, 'invalid'],
    ],
  },
};
