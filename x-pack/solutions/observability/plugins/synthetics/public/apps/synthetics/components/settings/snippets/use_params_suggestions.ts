/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { monaco } from '@kbn/monaco';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { MonacoEditorLangId } from '../../monitor_add_edit/types';

export const PARAMS_SUGGESTION_TRIGGER = 'params.';
export const useParamsSuggestions = () => {
  const { watch } = useFormContext();
  const [params, setParams] = useState<Set<string>>(new Set());

  const formParamsValue = watch('params');

  useEffect(() => {
    if (!formParamsValue) {
      setParams(new Set());
    } else {
      try {
        const parsedParams = JSON.parse(formParamsValue) as Record<string, unknown>;
        setParams(new Set(Object.keys(parsedParams)));
      } catch (e) {
        setParams(new Set());
      }
    }
  }, [formParamsValue]);

  const suggestionProvider = getSuggestionProvider(params);

  /**
   * This is necessary to register the provider when suggestionProvider changes. Otherwise,
   * the editor won't pick up new params added after initial registration.
   */
  useEffect(() => {
    const disposable = monaco.languages.registerCompletionItemProvider(
      MonacoEditorLangId.JAVASCRIPT,
      suggestionProvider
    );
    return () => disposable.dispose();
  }, [suggestionProvider]);

  return {
    suggestionProvider,
  };
};

const getSuggestionProvider = (params: Set<string>): monaco.languages.CompletionItemProvider => {
  return {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position) {
      const lineNumber = position.lineNumber;
      const lineContent = model.getLineContent(lineNumber);
      const word = model.getWordUntilPosition(position);

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

      const suggestions: monaco.languages.CompletionItem[] = [];

      if (lineContent.includes(PARAMS_SUGGESTION_TRIGGER)) {
        params.forEach((param, index) => {
          suggestions.push({
            label: param,
            kind: monaco.languages.CompletionItemKind.Variable,
            detail: 'Parameter',
            documentation: `Parameter: ${param}`,
            insertText: param,
            range,
            sortText: index.toString(),
          });
        });
      }

      return { suggestions };
    },
  };
};
