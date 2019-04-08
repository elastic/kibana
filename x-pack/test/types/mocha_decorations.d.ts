/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Suite } from 'mocha';

// tslint:disable-next-line:no-namespace We need to use the namespace here to match the Mocha definition
declare module 'mocha' {
  interface Suite {
    /**
     * Assign tags to the test suite to determine in which CI job it should be run.
     */
    tags(tags: string[] | string): void;
  }
}
