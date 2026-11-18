/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

/** How long the user has to pause typing for a search to run. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The text of a search field, which `apply` gets once the user pauses typing instead of at each
 * keystroke, so that what a search recomputes isn't recomputed per key. `applied` is the text that
 * was last applied.
 */
export const useDebouncedText = (
  applied: string,
  apply: (text: string) => void
): [string, (text: string) => void] => {
  const [text, setText] = useState(applied);
  useDebounce(
    () => {
      if (text !== applied) {
        apply(text);
      }
    },
    SEARCH_DEBOUNCE_MS,
    [text]
  );
  return [text, setText];
};
