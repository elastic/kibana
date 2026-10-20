/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findLast, last, uniq, uniqBy } from 'lodash';
import { monaco } from '@kbn/code-editor';
import {
  MetaArchValue,
  MetaOsValue,
  MetaScanTypeValue,
  YaraMetaKeyOfInterest,
} from '../../../../../common/endpoint/types/libyara';
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

const { CompletionItemKind, CompletionItemInsertTextRule, CompletionTriggerKind } =
  monaco.languages;
const { InsertAsSnippet } = CompletionItemInsertTextRule;

const STRING_REFERENCE_PREFIX_REGEX = /[$#@!]\w*$/;
const STRING_DEFINITION_REGEX = /^\s*\$(\w+)\s*=/gm;
const RULE_DEFINITION_REGEX = /\brule\s+([a-zA-Z_]\w*)/g;
const INTEGER_FUNCTION_REGEX = /^u?int\d+(?:be)?$/;
const NON_CODE_TOKEN_REGEX = /^(?:comment|string|regexp)/;
// The last match before the cursor tells the section, the capture group is empty in a rule header.
const SECTION_REGEX = /\b(?:rule\s+[a-zA-Z_]\w*|(meta|strings|condition)\s*:)/g;
const META_KEY_POSITION_REGEX = /^\s*\w*$/;
const META_VALUE_POSITION_REGEX = new RegExp(
  `^\\s*(${Object.values(YaraMetaKeyOfInterest).join('|')})\\s*=\\s*"([^"]*)$`
);
// Monaco closes the suggestions on typing a space, so it has to be a trigger character to keep
// suggesting values after `, `.
const META_VALUE_TRIGGER_CHARACTERS = ['"', ',', ' '];

const META_FIELDS = new Map<string, { detail: string; values: readonly string[] }>([
  [
    YaraMetaKeyOfInterest.OS,
    { detail: COMPLETION_DETAILS.metaOs, values: Object.values(MetaOsValue) },
  ],
  [
    YaraMetaKeyOfInterest.ARCH,
    { detail: COMPLETION_DETAILS.metaArch, values: Object.values(MetaArchValue) },
  ],
  [
    YaraMetaKeyOfInterest.SCAN_TYPE,
    { detail: COMPLETION_DETAILS.metaScanType, values: Object.values(MetaScanTypeValue) },
  ],
]);

// Listed first, and the value suggestions are opened right after inserting the key.
const META_KEY_SUGGESTIONS: Suggestion[] = Array.from(META_FIELDS, ([key, { detail }]) => ({
  label: key,
  kind: CompletionItemKind.Property,
  detail,
  insertText: `${key} = "$0"`,
  insertTextRules: InsertAsSnippet,
  sortText: `0-${key}`,
  command: { id: 'editor.action.triggerSuggest', title: '' },
}));

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

/** Returns the offsets of the rule containing the cursor, from its header until the next rule header. */
const getCurrentRuleRange = (
  text: string,
  cursorOffset: number
): { start: number; end: number } => {
  const ruleStarts = Array.from(text.matchAll(RULE_DEFINITION_REGEX), ({ index }) => index);

  return {
    start: findLast(ruleStarts, (ruleStart) => ruleStart < cursorOffset) ?? 0,
    end: ruleStarts.find((ruleStart) => ruleStart >= cursorOffset) ?? text.length,
  };
};

const getLastTokenType = (text: string): string =>
  last(last(monaco.editor.tokenize(text, YARA_LANG_ID)))?.type ?? '';

const isInsideMetaSection = (textUntilPosition: string): boolean =>
  last(Array.from(textUntilPosition.matchAll(SECTION_REGEX)))?.[1] === 'meta';

const getMetaValueSuggestions = (
  key: string,
  valueUntilPosition: string,
  { lineNumber, column }: monaco.Position
): monaco.languages.CompletionItem[] => {
  const items = valueUntilPosition.split(',');
  const currentItem = last(items) ?? '';
  const typedItem = currentItem.trimStart();
  const selectedItems = items.slice(0, -1).map((item) => item.trim());
  const isRightAfterComma = items.length > 1 && currentItem === typedItem;
  const range = {
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: column - typedItem.length,
    endColumn: column,
  };

  return (META_FIELDS.get(key)?.values ?? [])
    .filter((value) => !selectedItems.includes(value))
    .map((value) => ({
      label: value,
      kind: CompletionItemKind.EnumMember,
      detail: `meta.${key}`,
      insertText: isRightAfterComma ? ` ${value}` : value,
      filterText: value,
      range,
    }));
};

// Strings are scoped to the rule declaring them.
const getStringReferenceSuggestions = (
  currentRuleText: string,
  typedReference: string,
  range: monaco.IRange
): monaco.languages.CompletionItem[] => {
  const [prefix] = typedReference;

  return getCapturedNames(currentRuleText, STRING_DEFINITION_REGEX)
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
  range: monaco.IRange,
  isMetaKeyPosition: boolean
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

  return [
    ...(isMetaKeyPosition ? META_KEY_SUGGESTIONS : []),
    ...STATIC_SUGGESTIONS,
    ...ruleSuggestions,
  ].map((suggestion) => ({
    ...suggestion,
    range,
  }));
};

/**
 * Suggests keywords, snippets, and the strings and rules defined in the editor.
 * String references are suggested after typing `$`, `#`, `@` or `!`.
 * The meta fields that Elastic Defend uses are suggested with their allowed values.
 */
export const yaraCompletionProvider: monaco.languages.CompletionItemProvider = {
  triggerCharacters: ['$', '#', '@', '!', ...META_VALUE_TRIGGER_CHARACTERS],

  provideCompletionItems: (model, position, { triggerKind, triggerCharacter }) => {
    const { lineNumber, column } = position;
    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: lineNumber,
      endColumn: column,
    });
    const lastTokenType = getLastTokenType(textUntilPosition);
    const linePrefix = model.getLineContent(lineNumber).slice(0, column - 1);
    const metaValueMatch = linePrefix.match(META_VALUE_POSITION_REGEX);

    if (metaValueMatch && lastTokenType.startsWith('string')) {
      const [, key, valueUntilPosition] = metaValueMatch;
      return { suggestions: getMetaValueSuggestions(key, valueUntilPosition, position) };
    }

    const isMetaValueTrigger =
      triggerKind === CompletionTriggerKind.TriggerCharacter &&
      triggerCharacter !== undefined &&
      META_VALUE_TRIGGER_CHARACTERS.includes(triggerCharacter);

    if (isMetaValueTrigger || NON_CODE_TOKEN_REGEX.test(lastTokenType)) {
      return { suggestions: [] };
    }

    const text = model.getValue();
    const currentRuleRange = getCurrentRuleRange(text, textUntilPosition.length);
    const typedReference = linePrefix.match(STRING_REFERENCE_PREFIX_REGEX)?.[0];

    if (typedReference !== undefined) {
      const currentRuleText = text.slice(currentRuleRange.start, currentRuleRange.end);

      return {
        suggestions: getStringReferenceSuggestions(currentRuleText, typedReference, {
          startLineNumber: lineNumber,
          endLineNumber: lineNumber,
          startColumn: column - typedReference.length,
          endColumn: column,
        }),
      };
    }

    const { word, startColumn, endColumn } = model.getWordUntilPosition(position);

    const isMetaKeyPosition =
      META_KEY_POSITION_REGEX.test(linePrefix) && isInsideMetaSection(textUntilPosition);

    return {
      suggestions: getWordSuggestions(
        text,
        word,
        { startLineNumber: lineNumber, endLineNumber: lineNumber, startColumn, endColumn },
        isMetaKeyPosition
      ),
    };
  },
};
