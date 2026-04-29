/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import React, { useEffect, useState } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { KqlPluginStart, QuerySuggestion } from '@kbn/kql/public';

import { useEuiTheme } from '@elastic/eui';
import { WithKueryAutocompletion } from './with_kuery_autocompletion';
import { AutocompleteField } from './autocomplete_field';

type LoadSuggestionsFn = (
  e: string,
  p: number,
  m?: number,
  transform?: (s: QuerySuggestion[]) => QuerySuggestion[]
) => void;
export type CurryLoadSuggestionsType = (loadSuggestions: LoadSuggestionsFn) => LoadSuggestionsFn;

export interface RuleFlyoutKueryBarProps {
  derivedIndexPattern: DataViewBase;
  onSubmit: (query: string) => void;
  onChange?: (query: string) => void;
  value?: string | null;
  placeholder?: string;
  curryLoadSuggestions?: CurryLoadSuggestionsType;
  compressed?: boolean;
  kql: KqlPluginStart;
}

function validateQuery(query: string) {
  try {
    fromKueryExpression(query);
  } catch (err) {
    return false;
  }
  return true;
}

export function RuleFlyoutKueryBar({
  derivedIndexPattern,
  onSubmit,
  onChange,
  value,
  placeholder,
  curryLoadSuggestions = defaultCurryLoadSuggestions,
  compressed,
  kql,
}: RuleFlyoutKueryBarProps) {
  const [draftQuery, setDraftQuery] = useState<string>(value || '');
  const [isValid, setValidation] = useState<boolean>(true);

  // This ensures that if value changes out side this component it will update.
  useEffect(() => {
    if (value) {
      setDraftQuery(value);
    }
  }, [value]);

  const { euiTheme } = useEuiTheme();

  const handleChange = (query: string) => {
    setValidation(validateQuery(query));
    setDraftQuery(query);
    if (onChange) {
      onChange(query);
    }
  };

  const filteredDerivedIndexPattern = {
    ...derivedIndexPattern,
    fields: derivedIndexPattern.fields,
  };

  return (
    <WithKueryAutocompletion indexPattern={filteredDerivedIndexPattern} kql={kql}>
      {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
        <AutocompleteField
          compressed={compressed}
          aria-label={placeholder}
          isLoadingSuggestions={isLoadingSuggestions}
          isValid={isValid}
          loadSuggestions={curryLoadSuggestions(loadSuggestions)}
          onChange={handleChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
          suggestions={suggestions}
          value={draftQuery}
          theme={euiTheme}
        />
      )}
    </WithKueryAutocompletion>
  );
}

const defaultCurryLoadSuggestions: CurryLoadSuggestionsType =
  (loadSuggestions) =>
  (...args) =>
    loadSuggestions(...args);

// eslint-disable-next-line import/no-default-export
export default RuleFlyoutKueryBar;
