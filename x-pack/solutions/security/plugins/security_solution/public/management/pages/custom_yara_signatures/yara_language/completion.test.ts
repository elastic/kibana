/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import { registerYaraLanguage, YARA_LANG_ID } from '.';
import { yaraCompletionProvider } from './completion';
import {
  BUILT_IN_KEYWORDS,
  CONSTANT_KEYWORDS,
  DECLARATION_KEYWORDS,
  OPERATOR_KEYWORDS,
  QUANTIFIER_KEYWORDS,
  SECTION_KEYWORDS,
  STRING_MODIFIERS,
} from './keywords';

const { CompletionItemKind, CompletionItemInsertTextRule, CompletionTriggerKind } =
  monaco.languages;

// `|` and `^` are YARA operators, so a character that is not used in YARA marks the cursor.
const CURSOR = '█';

const RULE_WITH_STRINGS = [
  'rule a {',
  '  strings:',
  '    $a = "x"',
  '    $b_1 = { AA }',
  '    $ = "anonymous"',
  '  condition:',
  '    CONDITION',
  '}',
  'rule b {',
  '  strings:',
  '    $a = "duplicate"',
  '  condition:',
  '    $a',
  '}',
].join('\n');

const withCondition = (condition: string): string =>
  RULE_WITH_STRINGS.replace('CONDITION', condition);

const getSuggestions = async (
  textWithCursor: string
): Promise<monaco.languages.CompletionItem[]> => {
  const model = monaco.editor.createModel(textWithCursor.replace(CURSOR, ''), YARA_LANG_ID);
  const position = model.getPositionAt(textWithCursor.indexOf(CURSOR));

  const result = await yaraCompletionProvider.provideCompletionItems(
    model,
    position,
    { triggerKind: CompletionTriggerKind.Invoke },
    new monaco.CancellationTokenSource().token
  );
  model.dispose();

  return result?.suggestions ?? [];
};

const getLabels = (
  suggestions: monaco.languages.CompletionItem[],
  kind: monaco.languages.CompletionItemKind
): string[] =>
  suggestions.filter((suggestion) => suggestion.kind === kind).map(({ label }) => `${label}`);

describe('YARA completion', () => {
  let registerCompletionItemProviderSpy: jest.SpyInstance;

  beforeAll(() => {
    registerCompletionItemProviderSpy = jest.spyOn(
      monaco.languages,
      'registerCompletionItemProvider'
    );
    registerYaraLanguage();

    // Instantiating a model triggers the `onLanguage` callback that sets up the language features.
    monaco.editor.createModel('', YARA_LANG_ID).dispose();
  });

  it('should register the completion provider', () => {
    expect(registerCompletionItemProviderSpy).toHaveBeenCalledWith(
      YARA_LANG_ID,
      yaraCompletionProvider
    );
  });

  describe('keywords', () => {
    it('should suggest all keywords', async () => {
      const suggestions = await getSuggestions(CURSOR);

      expect(getLabels(suggestions, CompletionItemKind.Keyword).sort()).toEqual(
        [
          ...new Set([
            ...DECLARATION_KEYWORDS,
            ...SECTION_KEYWORDS,
            ...OPERATOR_KEYWORDS,
            ...QUANTIFIER_KEYWORDS,
            ...STRING_MODIFIERS,
          ]),
        ].sort()
      );
      expect(getLabels(suggestions, CompletionItemKind.Constant)).toEqual([...CONSTANT_KEYWORDS]);
      expect([
        ...getLabels(suggestions, CompletionItemKind.Variable),
        ...getLabels(suggestions, CompletionItemKind.Function),
      ]).toEqual([...BUILT_IN_KEYWORDS]);
    });

    it('should suggest `private` only once', async () => {
      const suggestions = await getSuggestions(CURSOR);

      expect(suggestions.filter(({ label }) => label === 'private')).toEqual([
        expect.objectContaining({ kind: CompletionItemKind.Keyword, detail: 'Keyword' }),
      ]);
    });

    it.each([...SECTION_KEYWORDS])('should insert `%s` with a colon', async (section) => {
      const suggestions = await getSuggestions(CURSOR);

      expect(suggestions).toContainEqual(
        expect.objectContaining({ label: section, insertText: `${section}:` })
      );
    });

    it('should insert integer functions as snippets with the cursor between the parentheses', async () => {
      const suggestions = await getSuggestions(CURSOR);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          label: 'uint16',
          kind: CompletionItemKind.Function,
          insertText: 'uint16($0)',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
        })
      );
      expect(suggestions).toContainEqual(
        expect.objectContaining({
          label: 'filesize',
          kind: CompletionItemKind.Variable,
          insertText: 'filesize',
        })
      );
    });

    it('should replace the word being typed', async () => {
      const suggestions = await getSuggestions(`a and rul${CURSOR}`);

      expect(suggestions[0].range).toEqual({
        startLineNumber: 1,
        endLineNumber: 1,
        startColumn: 7,
        endColumn: 10,
      });
    });
  });

  describe('snippets', () => {
    it('should suggest snippets', async () => {
      const suggestions = await getSuggestions(CURSOR);

      expect(getLabels(suggestions, CompletionItemKind.Snippet)).toEqual([
        'rule',
        'for..of',
        'for..in',
        'import',
      ]);
      expect(suggestions.filter(({ kind }) => kind === CompletionItemKind.Snippet)).toEqual(
        Array(4).fill(
          expect.objectContaining({
            insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          })
        )
      );
    });

    it('should insert a rule template', async () => {
      const suggestions = await getSuggestions(CURSOR);
      const ruleSnippet = suggestions.find(
        ({ label, kind }) => label === 'rule' && kind === CompletionItemKind.Snippet
      );

      expect(ruleSnippet?.insertText).toEqual(
        [
          'rule ${1:name}',
          '{',
          '\tstrings:',
          '\t\t\\$${2:a} = "${3:text}"',
          '',
          '\tcondition:',
          '\t\t${4:any of them}',
          '}',
        ].join('\n')
      );
    });
  });

  describe('rule references', () => {
    it('should suggest the rules defined in the editor', async () => {
      const suggestions = await getSuggestions(
        `rule Foo { condition: true }\nrule Bar { condition: ${CURSOR} }`
      );

      expect(getLabels(suggestions, CompletionItemKind.Reference)).toEqual(['Foo', 'Bar']);
    });

    it('should not suggest the rule name being typed', async () => {
      const suggestions = await getSuggestions(`rule Foo { condition: true }\nrule Fo${CURSOR}`);

      expect(getLabels(suggestions, CompletionItemKind.Reference)).toEqual(['Foo']);
    });
  });

  describe('string references', () => {
    it.each(['$', '#', '@', '!'])(
      'should suggest the defined strings after typing `%s`',
      async (prefix) => {
        const suggestions = await getSuggestions(withCondition(`${prefix}${CURSOR}`));

        expect(suggestions).toEqual([
          expect.objectContaining({
            label: `${prefix}a`,
            kind: CompletionItemKind.Variable,
            detail: 'String',
          }),
          expect.objectContaining({ label: `${prefix}b_1` }),
        ]);
      }
    );

    it('should replace the whole string reference being typed', async () => {
      const suggestions = await getSuggestions(withCondition(`#a > 1 and $b${CURSOR}`));

      expect(suggestions.map(({ label }) => label)).toEqual(['$a', '$b_1']);
      expect(suggestions[0].range).toEqual({
        startLineNumber: 7,
        endLineNumber: 7,
        startColumn: 16,
        endColumn: 18,
      });
    });

    it('should not suggest the string reference that is already typed', async () => {
      const suggestions = await getSuggestions(withCondition(`$a${CURSOR}`));

      expect(suggestions.map(({ label }) => label)).toEqual(['$b_1']);
    });

    it('should suggest string references after `!=`', async () => {
      const suggestions = await getSuggestions(withCondition(`!a != !${CURSOR}`));

      expect(suggestions.map(({ label }) => label)).toEqual(['!a', '!b_1']);
    });

    it('should not suggest string references without a prefix', async () => {
      const suggestions = await getSuggestions(withCondition(CURSOR));

      expect(getLabels(suggestions, CompletionItemKind.Variable)).toEqual([
        'filesize',
        'entrypoint',
      ]);
    });
  });

  describe('non-code contexts', () => {
    it.each([
      ['a line comment', `// $${CURSOR}`],
      ['a block comment', `/*\n  $${CURSOR} */`],
      ['a text string', `$a = "$${CURSOR}"`],
      ['a regular expression', `$a = /foo$${CURSOR}/`],
    ])('should not suggest anything inside %s', async (_, text) => {
      expect(await getSuggestions(text)).toEqual([]);
    });

    it('should suggest after a text string', async () => {
      const suggestions = await getSuggestions(`$a = "x" ${CURSOR}`);

      expect(suggestions).toContainEqual(expect.objectContaining({ label: 'nocase' }));
    });
  });
});
