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

// https://github.com/styled-components/jest-styled-components/issues/264
declare namespace jest {
  interface AsymmetricMatcher {
    $$typeof: Symbol; //eslint-disable-line
    sample?: string | RegExp | object | Array<any> | Function; // eslint-disable-line
  }

  type Value = string | number | RegExp | AsymmetricMatcher | undefined;

  interface Options {
    media?: string;
    modifier?: string;
    supports?: string;
  }

  interface Matchers<R> {
    toHaveStyleRule(property: string, value?: Value, options?: Options): R;
  }
}
