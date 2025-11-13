/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { getSnippets } from './api';
import type { SnippetData } from './snippets';

export const useGetSnippets = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [snippets, setSnippets] = useState<SnippetData[]>([]);

  const fetchSnippets = () => {
    return new Promise((resolve) => {
      setIsLoading(true);
      setTimeout(() => {
        const fetchedSnippets = getSnippets();
        setSnippets(fetchedSnippets);
        setIsLoading(false);
        resolve(fetchedSnippets);
      }, 500);
    });
  };

  return {
    isLoading,
    error,
    snippets,
    refetch: fetchSnippets,
  };
};
