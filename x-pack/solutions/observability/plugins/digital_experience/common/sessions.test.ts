/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PAGE_PATH_CASES } from './page_path_cases';
import { toPagePath } from './sessions';

describe('toPagePath', () => {
  it.each(PAGE_PATH_CASES)('labels %p as %p, like the dest pipeline', (raw, page) => {
    expect(toPagePath(raw)).toBe(page);
  });
});
