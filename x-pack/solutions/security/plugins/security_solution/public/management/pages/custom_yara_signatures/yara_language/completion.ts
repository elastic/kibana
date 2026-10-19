/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last, uniq, uniqBy } from 'lodash';
import { monaco } from '@kbn/code-editor';
import { YARA_LANG_ID } from './constants';
import {
  BUILT_IN_KEYWORDS,
  CONSTANT_KEYWORDS,
  DECLARATION_KEYWORDS,
  OPERATOR_KEYWORDS,
  QUANTIFIER_KEYWORDS,
  SECTION_KEYWORDS,
  STRING_MODIFIERS,
} from './keywords';
import { COMPLETION_DETAILS } from './translations';

type Suggestion = Omit<monaco.languages.CompletionItem, 'range'>;

const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
const { InsertAsSnippet } = CompletionItemInsertTextRule;

const STRING_REFERENCE_PREFIX_REGEX = /[$#@!]\w*$/;
const STRING_DEFINITION_REGEX = /^\s*\$(\w+)\s*=/gm;
const RULE_DEFINITION_REGEX = /\brule\s+([a-zA-Z_]\w*)/g;
const INTEGER_FUNCTION_REGEX = /^u?int\d+(?:be)?$/;
const NON_CODE_TOKEN_REGEX = /^(?:comment|string|regexp)/;

const toKeywordSuggestions = (
  keywords: readonly string[],
  detail: string,
  kind: monaco.languages.CompletionItemKind = CompletionItemKind.Keyword
): Suggestion[] =>
  keywords.map((keyword) => ({ label: keyword, kind, detail, insertText: keyword }));

const SNIPPET_SUGGESTIONS: Suggestion[] = [
  {
    label: 'rule',
    detail: COMPLETION_DETAILS.ruleSnippet,
    insertText: [
      'rule ${1:name}',
      '{',
      '\tstrings:',
      '\t\t\\$${2:a} = "${3:text}"',
      '',
      '\tcondition:',
      '\t\t${4:any of them}',
      '}',
    ].join('\n'),
  },
  {
    label: 'for..of',
    detail: COMPLETION_DETAILS.forOfSnippet,
    insertText: 'for ${1:any} of ${2:them} : ( ${3:\\$} )',
  },
  {
    label: 'for..in',
    detail: COMPLETION_DETAILS.forInSnippet,
    insertText: 'for ${1:any} ${2:i} in (${3:1}..${4:#a}) : ( ${5:@a[i]} )',
  },
  {
    label: 'import',
    detail: COMPLETION_DETAILS.importSnippet,
    insertText: 'import "${1:pe}"',
  },
].map((snippet) => ({
  ...snippet,
  kind: CompletionItemKind.Snippet,
  insertTextRules: InsertAsSnippet,
}));

// `private` is both a declaration keyword and a string modifier, so duplicates are removed.
const STATIC_SUGGESTIONS: Suggestion[] = uniqBy(
  [
    ...toKeywordSuggestions(DECLARATION_KEYWORDS, COMPLETION_DETAILS.keyword),
    ...SECTION_KEYWORDS.map(
      (section): Suggestion => ({
        label: section,
        kind: CompletionItemKind.Keyword,
        detail: COMPLETION_DETAILS.section,
        insertText: `${section}:`,
      })
    ),
    ...toKeywordSuggestions(OPERATOR_KEYWORDS, COMPLETION_DETAILS.operator),
    ...toKeywordSuggestions(QUANTIFIER_KEYWORDS, COMPLETION_DETAILS.quantifier),
    ...toKeywordSuggestions(STRING_MODIFIERS, COMPLETION_DETAILS.stringModifier),
    ...toKeywordSuggestions(
      CONSTANT_KEYWORDS,
      COMPLETION_DETAILS.constant,
      CompletionItemKind.Constant
    ),
    ...BUILT_IN_KEYWORDS.map(
      (builtIn): Suggestion =>
        INTEGER_FUNCTION_REGEX.test(builtIn)
          ? {
              label: builtIn,
              kind: CompletionItemKind.Function,
              detail: COMPLETION_DETAILS.builtIn,
              insertText: `${builtIn}($0)`,
              insertTextRules: InsertAsSnippet,
            }
          : {
              label: builtIn,
              kind: CompletionItemKind.Variable,
              detail: COMPLETION_DETAILS.builtIn,
              insertText: builtIn,
            }
    ),
    ...SNIPPET_SUGGESTIONS,
  ],
  ({ kind, label }) => `${kind}-${label}`
);

const getCapturedNames = (text: string, regex: RegExp): string[] =>
  uniq(Array.from(text.matchAll(regex), ([, name]) => name));

const isInsideNonCodeToken = (
  model: monaco.editor.ITextModel,
  { lineNumber, column }: monaco.Position
): boolean => {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: lineNumber,
    endColumn: column,
  });
  const lastToken = last(last(monaco.editor.tokenize(textUntilPosition, YARA_LANG_ID)));

  return lastToken !== undefined && NON_CODE_TOKEN_REGEX.test(lastToken.type);
};

const getStringReferenceSuggestions = (
  text: string,
  typedReference: string,
  range: monaco.IRange
): monaco.languages.CompletionItem[] => {
  const [prefix] = typedReference;

  return getCapturedNames(text, STRING_DEFINITION_REGEX)
    .map((name) => `${prefix}${name}`)
    .filter((reference) => reference !== typedReference)
    .map((reference) => ({
      label: reference,
      kind: CompletionItemKind.Variable,
      detail: COMPLETION_DETAILS.stringReference,
      insertText: reference,
      range,
    }));
};

const getWordSuggestions = (
  text: string,
  typedWord: string,
  range: monaco.IRange
): monaco.languages.CompletionItem[] => {
  const ruleSuggestions = getCapturedNames(text, RULE_DEFINITION_REGEX)
    .filter((ruleName) => ruleName !== typedWord)
    .map(
      (ruleName): Suggestion => ({
        label: ruleName,
        kind: CompletionItemKind.Reference,
        detail: COMPLETION_DETAILS.ruleReference,
        insertText: ruleName,
      })
    );

  return [...STATIC_SUGGESTIONS, ...ruleSuggestions].map((suggestion) => ({
    ...suggestion,
    range,
  }));
};

/**
 * Suggests keywords, snippets, and the strings and rules defined in the editor.
 * String references are suggested after typing `$`, `#`, `@` or `!`.
 */
export const yaraCompletionProvider: monaco.languages.CompletionItemProvider = {
  triggerCharacters: ['$', '#', '@', '!'],

  provideCompletionItems: (model, position) => {
    if (isInsideNonCodeToken(model, position)) {
      return { suggestions: [] };
    }

    const { lineNumber, column } = position;
    const text = model.getValue();
    const linePrefix = model.getLineContent(lineNumber).slice(0, column - 1);
    const typedReference = linePrefix.match(STRING_REFERENCE_PREFIX_REGEX)?.[0];

    if (typedReference !== undefined) {
      return {
        suggestions: getStringReferenceSuggestions(text, typedReference, {
          startLineNumber: lineNumber,
          endLineNumber: lineNumber,
          startColumn: column - typedReference.length,
          endColumn: column,
        }),
      };
    }

    const { word, startColumn, endColumn } = model.getWordUntilPosition(position);

    return {
      suggestions: getWordSuggestions(text, word, {
        startLineNumber: lineNumber,
        endLineNumber: lineNumber,
        startColumn,
        endColumn,
      }),
    };
  },
};
