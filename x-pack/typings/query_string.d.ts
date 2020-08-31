/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'query-string' {
  type ArrayFormat = 'bracket' | 'index' | 'none';

  export interface ParseOptions {
    arrayFormat?: ArrayFormat;
    sort?: ((itemLeft: string, itemRight: string) => number) | false;
  }

  export interface ParsedQuery<T = string> {
    [key: string]: T | T[] | null | undefined;
  }

  export function parse(str: string, options?: ParseOptions): ParsedQuery;

  export function parseUrl(str: string, options?: ParseOptions): { url: string; query: any };

  export interface StringifyOptions {
    strict?: boolean;
    encode?: boolean;
    arrayFormat?: ArrayFormat;
    sort?: ((itemLeft: string, itemRight: string) => number) | false;
  }

  export function stringify(obj: object, options?: StringifyOptions): string;

  export function extract(str: string): string;
}
