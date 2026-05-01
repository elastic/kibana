/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'serverless.onboarding.tutorials.completed';
const STORAGE_EVENT = 'serverless-onboarding-tutorials-changed';

const readCompleted = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((v): v is string => typeof v === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
};

const writeCompleted = (ids: Set<string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    // Notify other components in the same tab; `storage` event only fires
    // cross-tab so we dispatch our own.
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // localStorage unavailable (e.g. private browsing) — silently ignore.
  }
};

export const markTutorialComplete = (id: string): void => {
  const completed = readCompleted();
  if (completed.has(id)) return;
  completed.add(id);
  writeCompleted(completed);
};

export const isTutorialComplete = (id: string): boolean => readCompleted().has(id);

export const useTutorialProgress = () => {
  const [completed, setCompleted] = useState<Set<string>>(() => readCompleted());

  useEffect(() => {
    const refresh = () => setCompleted(readCompleted());
    window.addEventListener(STORAGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(STORAGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const markComplete = useCallback((id: string) => {
    markTutorialComplete(id);
    setCompleted(readCompleted());
  }, []);

  return { completed, markComplete };
};
