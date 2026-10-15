/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../onboarding/constants/languages';
import { ONBOARDING_LANGUAGE_STORAGE_KEY } from '../storage_keys';
import type { Language } from '../onboarding/types';

const isSupportedLanguage = (value: string | null): value is Language =>
  LANGUAGES.some(({ id }) => id === value);

const readStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(ONBOARDING_LANGUAGE_STORAGE_KEY);
    // A stored language can go stale if the language list changes between releases.
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

/**
 * Language selection for the onboarding code snippets, persisted so the choice
 * carries across wizard steps, page navigations and reloads.
 */
export const useSelectedLanguage = (): [Language, (language: Language) => void] => {
  const [language, setLanguage] = useState<Language>(readStoredLanguage);

  const selectLanguage = useCallback((nextLanguage: Language) => {
    setLanguage(nextLanguage);
    try {
      localStorage.setItem(ONBOARDING_LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Best-effort: the selection still applies for the current page.
    }
  }, []);

  return [language, selectLanguage];
};
