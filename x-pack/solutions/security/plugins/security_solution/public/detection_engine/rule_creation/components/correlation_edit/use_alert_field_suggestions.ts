/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '../../../../common/lib/kibana';

// Common ECS fields frequently used for correlation grouping
const COMMON_GROUPBY_FIELDS = [
  'host.name',
  'host.ip',
  'user.name',
  'user.id',
  'source.ip',
  'destination.ip',
  'process.name',
  'process.executable',
  'file.name',
  'file.path',
  'url.domain',
  'dns.question.name',
  'network.protocol',
  'event.action',
  'event.category',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
];

interface UseAlertFieldSuggestionsResult {
  fieldSuggestions: Array<{ label: string; value: string }>;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook to provide field autocomplete suggestions for correlation groupBy fields.
 * Returns common ECS fields that are frequently used for alert correlation.
 *
 * Future enhancement: Could fetch from actual alert index mappings for dynamic suggestions.
 */
export const useAlertFieldSuggestions = (): UseAlertFieldSuggestionsResult => {
  const { data } = useKibana().services;
  const [fieldSuggestions, setFieldSuggestions] = useState<Array<{ label: string; value: string }>>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    // For now, return common ECS fields
    // Future: Fetch from data.indexPatterns or alert index mappings
    const suggestions = COMMON_GROUPBY_FIELDS.map((field) => ({
      label: field,
      value: field,
    }));

    setFieldSuggestions(suggestions);
    setIsLoading(false);
  }, [data]);

  return { fieldSuggestions, isLoading, error };
};
