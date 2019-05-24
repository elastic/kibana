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

declare module 'lodash/internal/toPath' {
  function toPath(value: string | string[]): string[];
  export = toPath;
}
