/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DeferredInterface<T = void> {
  promise: Promise<T>;
  resolve: (data: T) => void;
  reject: (e: Error) => void;
}

export const getDeferred = function <T = void>(): DeferredInterface<T> {
  let resolve: DeferredInterface<T>['resolve'];
  let reject: DeferredInterface<T>['reject'];

  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  // @ts-ignore
  return { promise, resolve, reject };
};

interface TestSubjGenerator {
  (suffix?: string): string;

  /**
   * Compose a new `TestSubjGenerator` that includes the previously provided prefix as well*/
  withPrefix: (prefix: string) => TestSubjGenerator;
}

/**
 * A testing utility for creating lists of tests iDs that can be used for testing.
 * This utility goes along with the `useTestIdGenerator()` hook and can be useful for large
 * reusable components if wanting to expose a list of tests ids that component supports.
 *
 * @param testSubjPrefix
 */
export const createTestSubjGenerator = (testSubjPrefix: string): TestSubjGenerator => {
  const testSubjGenerator: TestSubjGenerator = (suffix) => {
    if (suffix) {
      return `${testSubjPrefix}-${suffix}`;
    }
    return testSubjPrefix;
  };

  testSubjGenerator.withPrefix = (prefix: string): TestSubjGenerator => {
    return createTestSubjGenerator(testSubjGenerator(prefix));
  };

  return testSubjGenerator;
};
