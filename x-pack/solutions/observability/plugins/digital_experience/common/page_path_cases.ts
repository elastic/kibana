/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Page labels for raw URLs. The sessions dest pipeline (`pathOf` in Painless) labels the journey
 * and entry/exit pages, `toPagePath` the session timeline, and both must agree with these cases.
 */
export const PAGE_PATH_CASES: ReadonlyArray<readonly [raw: string | null, page: string | null]> = [
  ['https://shop.example/', '/'],
  ['https://shop.example', '/'],
  ['https://shop.example/products/42?ref=home', '/products/42'],
  ['https://shop.example/search?q=shoes#results', '/search'],
  ['https://shop.example/app#/orders/7?tab=items', '/orders/7'],
  ['https://shop.example/app/#/', '/'],
  ['https://shop.example/docs#install', '/docs'],
  ['https://shop.example/a%20b/c', '/a%20b/c'],
  ['  https://shop.example/trimmed  ', '/trimmed'],
  ['/relative/path?x=1', '/relative/path'],
  ['?only=query', '/'],
  ['', null],
  ['   ', null],
  ['null', null],
  [null, null],
];
