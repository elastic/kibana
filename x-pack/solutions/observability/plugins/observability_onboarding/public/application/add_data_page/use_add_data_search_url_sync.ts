/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';

/**
 * Owns the raw search input value and mirrors the trimmed value into the
 * `?search=` param (replace-style, dropped when empty, other params kept).
 */
export function useAddDataSearchUrlSync(): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTerm = searchParams.get('search') ?? '';
  const [searchValue, setSearchValue] = useState<string>(urlTerm);

  // Reconciles inbound URL changes (back/forward) only. A trim-match leaves the
  // local value alone, so raw input like trailing spaces survives typing.
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
