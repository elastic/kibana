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

declare module 'axios/lib/adapters/xhr';

// Storybook references this module. It's @ts-ignored in the codebase but when
// built into its dist it strips that out. Add it here to avoid a type checking
// error.
//
// See https://github.com/storybookjs/storybook/issues/11684
declare module 'react-syntax-highlighter/dist/cjs/create-element';
