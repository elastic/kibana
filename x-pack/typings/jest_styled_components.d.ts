/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
