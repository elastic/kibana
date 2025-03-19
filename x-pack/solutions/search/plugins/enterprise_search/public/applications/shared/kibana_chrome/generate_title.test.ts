/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateTitle, searchTitle } from './generate_title';

describe('generateTitle', () => {
  it('creates a hyphen separated string from an array of page titles', () => {
    const title = generateTitle(['Curations', 'some Engine', 'App Search']);
    expect(title).toEqual('Curations - some Engine - App Search');
  });
});

describe('searchTitle', () => {
  it('automatically appends the Enterprise Search product onto the pages array', () => {
    const title = searchTitle(['Setup Guide']);
    expect(title).toEqual('Setup Guide - Elasticsearch');
  });

  it('can be mixed and matched', () => {
    const title = searchTitle([generateTitle(['Some Page', 'App Search'])]);
    expect(title).toEqual('Some Page - App Search - Elasticsearch');
  });

  it('falls back to product name', () => {
    const title = searchTitle();
    expect(title).toEqual('Elasticsearch');
  });
});
