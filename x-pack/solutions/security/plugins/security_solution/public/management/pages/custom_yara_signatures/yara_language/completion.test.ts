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
  '    $c = "other"',
  '  condition:',
  '    $c',
  '}',
].join('\n');

const withCondition = (condition: string): string =>
  RULE_WITH_STRINGS.replace('CONDITION', condition);

const withMeta = (metaLine: string): string =>
  [
    'rule a {',
    '  meta:',
    '    author = "me"',
    `    ${metaLine}`,
    '  condition:',
    '    true',
    '}',
  ].join('\n');

const getSuggestions = async (
  textWithCursor: string,
  triggerCharacter?: string
): Promise<monaco.languages.CompletionItem[]> => {
  const model = monaco.editor.createModel(textWithCursor.replace(CURSOR, ''), YARA_LANG_ID);
  const position = model.getPositionAt(textWithCursor.indexOf(CURSOR));

  const result = await yaraCompletionProvider.provideCompletionItems(
    model,
    position,
    triggerCharacter === undefined
      ? { triggerKind: CompletionTriggerKind.Invoke }
      : { triggerKind: CompletionTriggerKind.TriggerCharacter, triggerCharacter },
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
    it('should only suggest the rules declared before the current rule', async () => {
      const suggestions = await getSuggestions(
        [
          'rule Foo { condition: true }',
          'rule Bar { condition: true }',
          `rule Baz { condition: Foo and ${CURSOR} }`,
          'rule Qux { condition: true }',
        ].join('\n')
      );

      expect(getLabels(suggestions, CompletionItemKind.Reference)).toEqual(['Foo', 'Bar']);
    });

    it('should not suggest rule names in strings and comments', async () => {
      const suggestions = await getSuggestions(
        [
          '// this rule detects',
          'rule Foo {',
          '  strings:',
          '    $a = "rule decoy"',
          '  condition:',
          '    $a /* rule other */',
          '}',
          `rule Bar { condition: ${CURSOR} }`,
        ].join('\n')
      );

      expect(getLabels(suggestions, CompletionItemKind.Reference)).toEqual(['Foo']);
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

    it('should only suggest the strings defined in the current rule', async () => {
      const suggestions = await getSuggestions(
        [
          'rule a {',
          '  strings:',
          '    $a = "x"',
          '  condition:',
          '    $a',
          '}',
          'rule b {',
          '  strings:',
          '    $b = "y"',
          '  condition:',
          `    $a or $${CURSOR}`,
          '}',
          'rule c {',
          '  strings:',
          '    $c = "z"',
          '  condition:',
          '    $c',
          '}',
        ].join('\n')
      );

      expect(suggestions.map(({ label }) => label)).toEqual(['$b']);
    });

    it('should ignore rule declarations in strings and comments', async () => {
      const suggestions = await getSuggestions(
        [
          'rule a {',
          '  strings:',
          '    $a = "rule decoy"',
          '    // this rule detects',
          '    /* rule other */',
          '    $b = /rule regex/',
          '  condition:',
          `    $${CURSOR}`,
          '}',
        ].join('\n')
      );

      expect(suggestions.map(({ label }) => label)).toEqual(['$a', '$b']);
    });

    it('should not suggest string references without a prefix', async () => {
      const suggestions = await getSuggestions(withCondition(CURSOR));

      expect(getLabels(suggestions, CompletionItemKind.Variable)).toEqual([
        'filesize',
        'entrypoint',
      ]);
    });
  });

  describe('meta fields', () => {
    it('should suggest the meta keys of interest first in the meta section', async () => {
      const suggestions = await getSuggestions(withMeta(CURSOR));

      expect(suggestions.slice(0, 3)).toEqual([
        expect.objectContaining({
          label: 'os',
          kind: CompletionItemKind.Property,
          detail: 'Comma separated list of operating systems',
          insertText: 'os = "$0"',
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          command: expect.objectContaining({ id: 'editor.action.triggerSuggest' }),
        }),
        expect.objectContaining({ label: 'arch', insertText: 'arch = "$0"' }),
        expect.objectContaining({ label: 'scan_type', insertText: 'scan_type = "$0"' }),
      ]);
      expect(suggestions.slice(0, 3).map(({ sortText }) => sortText)).toEqual([
        '0-os',
        '0-arch',
        '0-scan_type',
      ]);
    });

    it('should suggest the meta keys after rule declarations and section labels in strings and comments', async () => {
      const suggestions = await getSuggestions(
        withMeta(`description = "rule decoy strings:" // rule other condition:\n    ${CURSOR}`)
      );

      expect(getLabels(suggestions, CompletionItemKind.Property)).toEqual([
        'os',
        'arch',
        'scan_type',
      ]);
    });

    it('should suggest the meta keys while typing a key', async () => {
      const suggestions = await getSuggestions(withMeta(`sc${CURSOR}`));

      expect(getLabels(suggestions, CompletionItemKind.Property)).toEqual([
        'os',
        'arch',
        'scan_type',
      ]);
    });

    it.each([
      ['after `=`', withMeta(`os = ${CURSOR}`)],
      ['in the rule header', `rule a ${CURSOR}`],
      ['in the strings section', `rule a {\n  meta:\n    os = "Linux"\n  strings:\n    ${CURSOR}`],
      ['in the condition section', withCondition(CURSOR)],
    ])('should not suggest the meta keys %s', async (_, text) => {
      const suggestions = await getSuggestions(text);

      expect(getLabels(suggestions, CompletionItemKind.Property)).toEqual([]);
    });

    it.each([
      ['os', ['Windows', 'Linux', 'MacOS']],
      ['arch', ['x86', 'arm64']],
      ['scan_type', ['Memory']],
    ])('should suggest the values of `meta.%s`', async (key, values) => {
      const suggestions = await getSuggestions(withMeta(`${key} = "${CURSOR}"`), '"');

      expect(suggestions.map(({ label }) => label)).toEqual(values);
      expect(suggestions).toEqual(
        Array(values.length).fill(
          expect.objectContaining({ kind: CompletionItemKind.EnumMember, detail: `meta.${key}` })
        )
      );
    });

    it('should not suggest the values that are already listed', async () => {
      const suggestions = await getSuggestions(withMeta(`os = "Windows, ${CURSOR}"`), ' ');

      expect(suggestions.map(({ label }) => label)).toEqual(['Linux', 'MacOS']);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({
          insertText: 'Linux',
          range: { startLineNumber: 4, endLineNumber: 4, startColumn: 20, endColumn: 20 },
        })
      );
    });

    it('should insert a space before the value right after a comma', async () => {
      const suggestions = await getSuggestions(withMeta(`os = "Linux,${CURSOR}"`), ',');

      expect(suggestions.map(({ label }) => label)).toEqual(['Windows', 'MacOS']);
      expect(suggestions[0]).toEqual(
        expect.objectContaining({ insertText: ' Windows', filterText: 'Windows' })
      );
    });

    it('should replace the value being typed', async () => {
      const suggestions = await getSuggestions(withMeta(`arch = "x86, ar${CURSOR}"`));

      expect(suggestions).toEqual([
        expect.objectContaining({
          label: 'arm64',
          insertText: 'arm64',
          range: { startLineNumber: 4, endLineNumber: 4, startColumn: 18, endColumn: 20 },
        }),
      ]);
    });

    it('should not suggest values for other meta fields', async () => {
      expect(await getSuggestions(withMeta(`description = "${CURSOR}"`), '"')).toEqual([]);
    });

    it.each([
      ['`"` in a text string', `$a = "${CURSOR}"`, '"'],
      ['`,` in a condition', withCondition(`any of ($a,${CURSOR})`), ','],
      ['a space in a condition', withCondition(`any of ${CURSOR}`), ' '],
      ['a space in a meta value', withMeta(`description = "foo ${CURSOR}"`), ' '],
    ])('should not suggest anything when triggered by %s', async (_, text, triggerCharacter) => {
      expect(await getSuggestions(text, triggerCharacter)).toEqual([]);
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
