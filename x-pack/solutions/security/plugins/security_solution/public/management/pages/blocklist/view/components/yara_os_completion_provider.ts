/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/code-editor';
import type { YaraDiagnostic } from '../../../../../../common/endpoint/libyara';
import { validateYaraRule } from '../../../../../../common/endpoint/libyara';

export const YARA_LANG_ID = 'yara';
export const YARA_OS_VALIDATION_OWNER = 'yara-os-validation';
export const YARA_LIBYARA_VALIDATION_OWNER = 'yara-libyara-validation';

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

export const validateYaraRuleModel = async (
  model: monaco.editor.ITextModel
): Promise<monaco.editor.IMarkerData[]> => {
  const text = model.getValue();
  const results = await validateYaraRule(text);

  const markers: monaco.editor.IMarkerData[] = [];

  const lines = text.split('\n');

  for (const error of results.errors) {
    const { startColumn, endColumn } = getCoords(lines, error);

    markers.push({
      severity: monaco.MarkerSeverity.Error,
      message: error.message,

      startLineNumber: error.line,
      startColumn,
      endLineNumber: error.line,
      endColumn,
    });
  }

  for (const warning of results.warnings) {
    const { startColumn, endColumn } = getCoords(lines, warning);

    markers.push({
      severity: monaco.MarkerSeverity.Warning,
      message: warning.message,

      startLineNumber: warning.line,
      startColumn,
      endLineNumber: warning.line,
      endColumn,
    });
  }

  monaco.editor.setModelMarkers(model, YARA_LIBYARA_VALIDATION_OWNER, markers);

  const osMarkers = buildYaraOsValidationMarkers(model);

  return [...markers, ...osMarkers];
};

const getCoords = (lines: string[], error: YaraDiagnostic) => {
  const line = lines[error.line - 1];

  let startColumn = 0;
  let endColumn = Infinity;

  const unexpectedToken = error.message.match(/unexpected '([^']+)'/)?.[1];
  if (unexpectedToken) {
    const tokenIndex = line.indexOf(unexpectedToken);
    startColumn = tokenIndex + 1;
    endColumn = startColumn + unexpectedToken.length;
  } else {
    startColumn = line.indexOf(line.trimStart()[0]) + 1;
    endColumn = startColumn + line.trim().length;
  }
  return { startColumn, endColumn };
};

export const buildYaraOsValidationMarkers = (
  model: monaco.editor.ITextModel
): monaco.editor.IMarkerData[] => {
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

  return markers;
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
