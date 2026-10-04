/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

/**
 * Wraps an async action and tracks whether it's running. Lets the browser paint the loading
 * state before running the action, so heavy synchronous work (e.g. validating large forms)
 * doesn't delay the loading indicator.
 */
export const useAsyncActionWithLoading = (
  action: () => Promise<unknown> | undefined
): [isLoading: boolean, run: () => Promise<void>] => {
  const [isLoading, setIsLoading] = useState(false);

  const run = useCallback(async () => {
    setIsLoading(true);

    try {
      await waitForNextPaint();
      await action();
    } finally {
      setIsLoading(false);
    }
  }, [action]);

  return [isLoading, run];
};

/* `requestAnimationFrame` callbacks run right before a paint, `setTimeout` moves past it */
const waitForNextPaint = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
