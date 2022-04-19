/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates a test runner that can be used to run multiple async test cases
 * in parallel. Makes it easy/convenient to convert `it('', ...)` to
 * `runner.test('', ...)`
 */
export const createParallelTestRunner = () => {
  const r = {
    tests: {} as Record<string, () => Promise<any>>,
    test: (key: string, test: () => Promise<any>) => {
      r.tests[key] = test;
    },
    run: async () => {
      const promises = Object.keys(r.tests).map(async (key) => {
        try {
          await r.tests[key]();
        } catch (ex: any) {
          throw new Error(`during ${key}:\n${ex.toString()}`);
        }
      });
      await Promise.all(promises);
    },
  };

  return r;
};
