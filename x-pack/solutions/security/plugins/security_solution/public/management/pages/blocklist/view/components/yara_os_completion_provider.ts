/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';

export const YARA_LANG_ID = 'yara';
export const YARA_OS_VALIDATION_OWNER = 'yara-os-validation';

export const YARA_OS_VALUES = ['Linux', 'Windows', 'Macos'] as const;

const YARA_OS_VALUE_SET = new Set<string>(YARA_OS_VALUES);

const OS_VALUE_PATTERN = /\bos\s*=\s*"([^"]*)$/;
const OS_ASSIGNMENT_PATTERN = /\bos\s*=\s*"([^"]*)"/g;

const INVALID_OS_MESSAGE = `OS must be one of: ${YARA_OS_VALUES.join(', ')}`;

let isYaraLanguageRegistered = false;

export const registerYaraLanguage = (): void => {
  if (isYaraLanguageRegistered) {
    return;
  }

  if (monaco.languages.getLanguages().some((language) => language.id === YARA_LANG_ID)) {
    isYaraLanguageRegistered = true;
    return;
  }

  monaco.languages.register({ id: YARA_LANG_ID });
  isYaraLanguageRegistered = true;
};

export const buildYaraOsValidationMarkers = (model: monaco.editor.ITextModel): void => {
  const text = model.getValue();
  const markers: monaco.editor.IMarkerData[] = [];

  for (const match of text.matchAll(OS_ASSIGNMENT_PATTERN)) {
    const osValue = match[1];
    const quotedValue = `"${osValue}"`;
    const valueStartOffset = match.index + match[0].lastIndexOf(quotedValue) + 1;
    const valueEndOffset = valueStartOffset + osValue.length;

    if (!YARA_OS_VALUE_SET.has(osValue)) {
      const startPosition = model.getPositionAt(valueStartOffset);
      const endPosition = model.getPositionAt(valueEndOffset);

      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: INVALID_OS_MESSAGE,
        startLineNumber: startPosition.lineNumber,
        startColumn: startPosition.column,
        endLineNumber: endPosition.lineNumber,
        endColumn: endPosition.column,
      });
    }
  }

  monaco.editor.setModelMarkers(model, YARA_OS_VALIDATION_OWNER, markers);
};

export const getYaraOsCompletionProvider = (): monaco.languages.CompletionItemProvider => ({
  triggerCharacters: ['=', '"', ' '],
  provideCompletionItems: (model, position) => {
    const line = model.getLineContent(position.lineNumber);
    const textBeforeCursor = line.slice(0, position.column - 1);
    const osValueMatch = textBeforeCursor.match(OS_VALUE_PATTERN);

    if (!osValueMatch) {
      return { suggestions: [] };
    }

    const partialValue = osValueMatch[1];
    const range = new monaco.Range(
      position.lineNumber,
      position.column - partialValue.length,
      position.lineNumber,
      position.column
    );

    return {
      suggestions: YARA_OS_VALUES.filter((value) =>
        value.toLowerCase().startsWith(partialValue.toLowerCase())
      ).map((value) => ({
        label: value,
        kind: monaco.languages.CompletionItemKind.Value,
        insertText: `${value}"`,
        range,
      })),
    };
  },
});
