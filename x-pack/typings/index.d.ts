/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module '*.html' {
  const template: string;
  // eslint-disable-next-line import/no-default-export
  export default template;
}

declare module '*.png' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

declare module '*.svg' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}

type MethodKeysOf<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

type PublicMethodsOf<T> = Pick<T, MethodKeysOf<T>>;

declare module 'axios/lib/adapters/xhr';

type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

// allow JSON files to be imported directly without lint errors
// see: https://github.com/palantir/tslint/issues/1264#issuecomment-228433367
// and: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#arbitrary-expressions-are-forbidden-in-export-assignments-in-ambient-contexts
declare module '*.json' {
  const json: any;
  // eslint-disable-next-line import/no-default-export
  export default json;
}
