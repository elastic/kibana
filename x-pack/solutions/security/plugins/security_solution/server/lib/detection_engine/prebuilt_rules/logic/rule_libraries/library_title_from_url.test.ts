/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLibraryTitleFromUrl } from './library_title_from_url';

describe('getLibraryTitleFromUrl', () => {
  it.each([
    ['https://github.com/org/rules-library', 'rules-library'],
    ['https://github.com/org/rules-library.git', 'rules-library'],
    ['git@github.com:org/rules-library.git', 'rules-library'],
    ['ssh://git@git.example.com:2222/org/rules-library.git', 'rules-library'],
    ['https://s3.eu-west-1.amazonaws.com/my-bucket', 'my-bucket'],
    ['https://git.example.com', 'git.example.com'],
  ])('names %s as %s', (url, title) => {
    expect(getLibraryTitleFromUrl(url)).toBe(title);
  });
});
