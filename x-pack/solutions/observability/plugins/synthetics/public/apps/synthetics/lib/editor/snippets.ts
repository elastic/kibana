/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { monaco } from '@kbn/monaco';

/**
 * Minimal suggestion provider exposing a few commonly used snippets.
 * Keep this lightweight and synchronous to avoid runtime perf impact.
 */
export const syntheticsSuggestionProvider: monaco.languages.CompletionItemProvider = {
  provideCompletionItems(model, position) {
    const lineNumber = position.lineNumber;
    const lineContent = model.getLineContent(lineNumber);

    const word = model.getWordAtPosition(position);
    const range: monaco.IRange = word
      ? {
          startLineNumber: lineNumber,
          endLineNumber: lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }
      : new monaco.Range(lineNumber, position.column, lineNumber, position.column);

    const suggestions: monaco.languages.CompletionItem[] = [
      {
        label: 'navigate',
        kind: monaco.languages.CompletionItemKind.Snippet,
        detail: 'Navigate to a URL and wait',
        documentation: 'Navigate to the provided URL and wait for the page to load.',
        insertText: "await page.goto('https://example.com');\nawait page.waitForLoadState('load');",
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
    ];

    if (lineContent.includes('page.')) {
      suggestions.forEach((s) => (s.sortText = '0'));
    }

    return { suggestions };
  },
};
