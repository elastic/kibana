/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {}; // Hack to declare this file as a module so TS allows us to extend the Global Window interface

declare global {
  interface Window {
    __applicationIds__: string[];
  }
}
