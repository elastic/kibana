/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Executes/Runs the provided function and sets up event listeners for NodeJs process interruptions so
 * that a `cleanup()` method can executed if an interruption is caught
 * @param runFn
 * @param cleanup
 */
export const handleProcessInterruptions = async <T>(
  runFn: (() => T) | (() => Promise<T>),
  /** The synchronous cleanup callback */
  cleanup: () => void
): Promise<T> => {
  const eventNames = ['SIGINT', 'exit', 'uncaughtException', 'unhandledRejection'];
  const stopListeners = () => {
    for (const eventName of eventNames) {
      process.off(eventName, cleanup);
    }
  };

  for (const eventName of eventNames) {
    process.on(eventName, cleanup);
  }

  let runnerResponse: T | Promise<T>;

  try {
    runnerResponse = runFn();
  } catch (e) {
    stopListeners();
    throw e;
  }

  // @ts-expect-error upgrade typescript v4.9.5
  if ('finally' in runnerResponse) {
    (runnerResponse as Promise<T>).finally(() => {
      stopListeners();
    });
  } else {
    stopListeners();
  }

  return runnerResponse;
};
