/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markTutorialComplete, isTutorialComplete } from './use_tutorial_progress';
import { TUTORIAL_PROGRESS_STORAGE_KEY, TUTORIAL_PROGRESS_EVENT } from '../storage_keys';

beforeEach(() => {
  localStorage.clear();
});

describe('isTutorialComplete', () => {
  it('returns false when no tutorials have been completed', () => {
    expect(isTutorialComplete('my-tutorial')).toBe(false);
  });

  it('returns true after that tutorial is marked complete', () => {
    markTutorialComplete('my-tutorial');
    expect(isTutorialComplete('my-tutorial')).toBe(true);
  });

  it('returns false for a different tutorial id', () => {
    markTutorialComplete('tutorial-a');
    expect(isTutorialComplete('tutorial-b')).toBe(false);
  });

  it('returns false when stored value is not a JSON array', () => {
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, '{}');
    expect(isTutorialComplete('my-tutorial')).toBe(false);
  });

  it('returns false when stored value is invalid JSON', () => {
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, 'not-json');
    expect(isTutorialComplete('my-tutorial')).toBe(false);
  });

  it('ignores non-string entries in the stored array', () => {
    localStorage.setItem(TUTORIAL_PROGRESS_STORAGE_KEY, JSON.stringify([1, null, 'valid-id']));
    expect(isTutorialComplete('valid-id')).toBe(true);
    expect(isTutorialComplete('1')).toBe(false);
  });
});

describe('markTutorialComplete', () => {
  it('persists the tutorial id to localStorage', () => {
    markTutorialComplete('my-tutorial');
    const stored = JSON.parse(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)!);
    expect(stored).toContain('my-tutorial');
  });

  it('is idempotent — marking the same id twice does not duplicate it', () => {
    markTutorialComplete('my-tutorial');
    markTutorialComplete('my-tutorial');
    const stored = JSON.parse(localStorage.getItem(TUTORIAL_PROGRESS_STORAGE_KEY)!);
    expect(stored.filter((v: string) => v === 'my-tutorial')).toHaveLength(1);
  });

  it('preserves previously completed tutorials', () => {
    markTutorialComplete('tutorial-a');
    markTutorialComplete('tutorial-b');
    expect(isTutorialComplete('tutorial-a')).toBe(true);
    expect(isTutorialComplete('tutorial-b')).toBe(true);
  });

  it('dispatches the progress event', () => {
    const listener = jest.fn();
    window.addEventListener(TUTORIAL_PROGRESS_EVENT, listener);
    markTutorialComplete('my-tutorial');
    window.removeEventListener(TUTORIAL_PROGRESS_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch an event when the tutorial is already complete', () => {
    markTutorialComplete('my-tutorial');
    const listener = jest.fn();
    window.addEventListener(TUTORIAL_PROGRESS_EVENT, listener);
    markTutorialComplete('my-tutorial');
    window.removeEventListener(TUTORIAL_PROGRESS_EVENT, listener);
    expect(listener).not.toHaveBeenCalled();
  });
});
