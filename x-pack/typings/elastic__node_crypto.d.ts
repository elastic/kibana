/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module '@elastic/node-crypto';
declare module 'node-jose' {
  export interface JWK {
    [x: string]: any;
  }
  export interface JWE {
    [x: string]: any;
  }
  export interface JWKS {
    [x: string]: any;
  }
  export interface Util {
    [x: string]: any;
  }

  export const JWK: JWK;
  export const JWE: JWE;
  export const util: Util;
}
