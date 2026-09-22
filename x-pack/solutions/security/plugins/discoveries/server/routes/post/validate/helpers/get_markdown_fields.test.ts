/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMarkdownFields } from './get_markdown_fields';

describe('getMarkdownFields', () => {
  it('returns the extracted field values from handlebars-like placeholders', () => {
    expect(getMarkdownFields('Hello {{ host.name SRVWIN04}}')).toBe('Hello SRVWIN04');
  });
});
