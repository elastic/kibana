/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import deepEqual from 'fast-deep-equal';
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';

/**
 * Wrapper around `@kbn/expandable-flyout`'s `useExpandableFlyoutState` that
 * returns the previous reference when the newly selected value is deep-equal
 * to the previously returned one.
 *
 * The shared package dispatches twice in a row when a panel is opened from
 * Security Solution code (`openRightPanelAction` followed by an echoed
 * `urlChangedAction` after URL sync). The second dispatch carries identical
 * content but produces fresh object references, which causes subscribers of
 * `useExpandableFlyoutState()` to re-render even though nothing meaningful
 * changed.
 *
 * Using this hook does not prevent the owning component from rendering once
 * per echo (the underlying `useSelector` has already triggered a render before
 * our check runs). It does however keep derived values, memoized children and
 * downstream hook dependencies reference-stable across the echo, which stops
 * the cascade into the rest of the tree.
 */
export const useStableExpandableFlyoutState = (): ReturnType<typeof useExpandableFlyoutState> => {
  const raw = useExpandableFlyoutState();
  const ref = useRef(raw);
  if (ref.current !== raw && deepEqual(ref.current, raw)) {
    return ref.current;
  }
  ref.current = raw;
  return raw;
};
