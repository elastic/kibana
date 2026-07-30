/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';

/**
 * Owns the raw search input value for the Add Data page and mirrors the
 * trimmed value into the `?search=` URL param (replace-style, param removed
 * when empty, unrelated params preserved). URL sync is a host concern: the
 * shared-shaped grid components receive the value via props and never read
 * the router. The URL write happens in the change handler. The effect only
 * reconciles inbound URL changes (back/forward, navigation), where the URL
 * wins unless it already equals the trimmed local value, which keeps raw
 * input (for example trailing spaces) intact while the user types.
 */
export function useAddDataSearchUrlSync(): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTerm = searchParams.get('search') ?? '';
  const [searchValue, setSearchValue] = useState<string>(urlTerm);

  useEffect(() => {
    setSearchValue((value) => (value.trim() === urlTerm ? value : urlTerm));
  }, [urlTerm]);

  const onChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      const term = value.trim();
      const next = new URLSearchParams(searchParams);
      if (term) {
        next.set('search', term);
      } else {
        next.delete('search');
      }
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
      }
    },
    [searchParams, setSearchParams]
  );

  return [searchValue, onChange];
}
