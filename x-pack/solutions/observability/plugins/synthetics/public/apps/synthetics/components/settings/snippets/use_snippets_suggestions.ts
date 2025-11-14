/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { monaco } from '@kbn/monaco';
import { MonacoEditorLangId } from '../../../../../../common/runtime_types';
import type { SyntheticsServiceSnippetCodec } from '../../../../../../common/runtime_types/synthetics_service_snippet';
import { PARAMS_SUGGESTION_TRIGGER } from './use_params_suggestions';

interface UseSuggestionProviderParams {
  snippets: SyntheticsServiceSnippetCodec[];
}

export const useSnippetsSuggestions = (params: UseSuggestionProviderParams) => {
  const { snippets } = params;

  /**
   * This is necessary to register the provider when snippets change. Otherwise,
   * the editor won't pick up new snippets added after initial registration.
   */
  useEffect(() => {
    const disposable = monaco.languages.registerCompletionItemProvider(
      MonacoEditorLangId.JAVASCRIPT,
      getSuggestionProvider(snippets)
    );
    return () => disposable.dispose();
  }, [snippets]);

  return {
    provider: getSuggestionProvider(snippets),
  };
};

const getSuggestionProvider = (snippets: SyntheticsServiceSnippetCodec[]) => {
  const provider: monaco.languages.CompletionItemProvider = {
    provideCompletionItems(model, position) {
      const lineNumber = position.lineNumber;
      const lineContent = model.getLineContent(lineNumber);

      if (lineContent.includes(PARAMS_SUGGESTION_TRIGGER)) {
        return { suggestions: [] };
      }

      const word = model.getWordAtPosition(position);

      const range: monaco.IRange = word
        ? {
            startLineNumber: lineNumber,
            endLineNumber: lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          }
        : {
            startLineNumber: lineNumber,
            endLineNumber: lineNumber,
            startColumn: position.column,
            endColumn: position.column,
          };

      const suggestions: monaco.languages.CompletionItem[] = [
        {
          label: 'navigate',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Navigate to a URL and wait',
          documentation: 'Navigate to the provided URL and wait for the page to load.',
          insertText:
            "await page.goto('${1:https://example.com}');\nawait page.waitForLoadState('load');\n$0",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: '0',
        },
        {
          label: 'click',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Click an element by selector',
          documentation: 'Click the element matched by the selector and optionally wait.',
          insertText: "await page.click('selector');\nawait page.waitForTimeout(500);",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: '1',
        },
        {
          label: 'waitFor',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Wait for a selector',
          documentation: 'Wait for a selector to appear in the page.',
          insertText: "await page.waitForSelector('selector', { timeout: 5000 });",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: '2',
        },
        {
          label: 'step',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Define a step with name and action',
          documentation: 'Defines a step with a given name and action to perform.',
          insertText: "step('${1:step name}', async () => {\n  ${0:// your code here}\n});",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: '3',
        },
        {
          label: 'clickText',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Click an element containing text',
          documentation: 'Click an element that contains the specified text.',
          insertText: "await page.getByText('${1:Text}').click();$0",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: '4',
        },
        {
          label: 'expectText',
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: 'Expect an element containing text to be visible',
          documentation:
            'Expect an element that contains the specified text to be visible on the page.',
          insertText: "expect(await page.getByText('${1:locator}')).toBeVisible();",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: '5',
        },
        ...snippets.map((snippet) => ({
          label: snippet.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: snippet.detail,
          documentation: snippet.detail,
          insertText: snippet.insertText,
          range,
        })),
      ];

      if (lineContent.includes('page.')) {
        suggestions.forEach((s) => (s.sortText = '0'));
      }

      return { suggestions };
    },
  };
  return provider;
};
