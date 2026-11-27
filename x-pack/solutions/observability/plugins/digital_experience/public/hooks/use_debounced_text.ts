/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

/** How long the user has to pause typing for a search to run. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The text of a search field, which `apply` gets once the user pauses typing instead of at each
 * keystroke, so that what a search recomputes isn't recomputed per key. `applied` is the text that
 * was last applied, and the field follows it when it changes elsewhere, e.g. when the filters are
 * cleared or the user goes back; a search that is already applied, but with spaces still being
 * typed around it, stays as typed.
 */
export const useDebouncedText = (
  applied: string | undefined,
  apply: (text: string) => void
): [string, (text: string) => void] => {
  const [text, setText] = useState(applied ?? '');

  useEffect(
    () => setText((current) => (current.trim() === (applied ?? '') ? current : applied ?? '')),
    [applied]
  );

  useDebounce(
    () => {
      if (text.trim() !== (applied ?? '')) {
        apply(text);
      }
    },
    SEARCH_DEBOUNCE_MS,
    [text]
  );

  return [text, setText];
};
