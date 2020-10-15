/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type MockedKeys<T> = { [P in keyof T]: jest.Mocked<Writable<T[P]>> };

type DeeplyMockedKeys<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? jest.MockInstance<ReturnType<T[P]>, Parameters<T[P]>>
    : DeeplyMockedKeys<T[P]>;
} &
  T;
