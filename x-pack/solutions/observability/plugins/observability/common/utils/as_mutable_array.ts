/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Sometimes we use `as const` to have a more specific type,
// because TypeScript by default will widen the value type of an
// array literal. Consider the following example:
//
// const filter = [
//   { term: { 'agent.name': 'nodejs' } },
//   { range: { '@timestamp': { gte: 'now-15m ' }}
// ];

// The result value type will be:

// const filter: ({
//   term: {
//     'agent.name'?: string
//   };
//   range?: undefined
// } | {
//   term?: undefined;
//   range: {
//     '@timestamp': {
//       gte: string
//     }
//   }
// })[];

// This can sometimes leads to issues. In those cases, we can
// use `as const`. However, the Readonly<any> type is not compatible
// with Array<any>. This function returns a mutable version of a type.

export function asMutableArray<T extends Readonly<any>>(
  arr: T
): T extends Readonly<[...infer U]> ? U : unknown[] {
  return arr as any;
}
