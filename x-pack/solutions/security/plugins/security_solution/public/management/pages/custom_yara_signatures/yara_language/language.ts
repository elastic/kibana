/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/code-editor';

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
  stringEscapes: /\\(?:["\\rtn]|x[0-9a-fA-F]{2})/,

  tokenizer: {
    root: [
      { include: '@whitespace' },

      // Text strings cannot span multiple lines, so an unterminated one is invalid until the end of the line.
      [/"(?:[^"\\]|\\.)*\\?$/, 'string.invalid'],
      [/"/, 'string', '@string'],

      [/[a-zA-Z_]\w*/, 'identifier'],
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
  },
};
