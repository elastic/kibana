/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rumBaseFilters } from './query';

describe('rumBaseFilters', () => {
  it('applies a single browser as a term should', () => {
    expect(rumBaseFilters({ browser: 'Chrome' })).toEqual(
      expect.arrayContaining([
        {
          bool: {
            should: [
              { term: { 'resource.attributes.browser.name': 'Chrome' } },
              { term: { 'attributes.browser.name': 'Chrome' } },
            ],
            minimum_should_match: 1,
          },
        },
      ])
    );
  });

  it('ORs comma-separated browsers', () => {
    expect(rumBaseFilters({ browser: 'Chrome,Firefox' })).toEqual(
      expect.arrayContaining([
        {
          bool: {
            should: [
              {
                bool: {
                  should: [
                    { term: { 'resource.attributes.browser.name': 'Chrome' } },
                    { term: { 'attributes.browser.name': 'Chrome' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    { term: { 'resource.attributes.browser.name': 'Firefox' } },
                    { term: { 'attributes.browser.name': 'Firefox' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ])
    );
  });

  it('negates bang-prefixed facet values', () => {
    expect(rumBaseFilters({ browser: '!Chrome' })).toEqual(
      expect.arrayContaining([
        {
          bool: {
            must_not: [
              {
                bool: {
                  should: [
                    { term: { 'resource.attributes.browser.name': 'Chrome' } },
                    { term: { 'attributes.browser.name': 'Chrome' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      ])
    );
  });

  it('ORs comma-separated page paths', () => {
    const page = rumBaseFilters({ pageUrl: '/checkout,/cart' }).find((clause) =>
      JSON.stringify(clause).includes('attributes.page.url.path')
    );
    expect(page).toEqual({
      bool: {
        should: [
          expect.objectContaining({
            query_string: expect.objectContaining({ query: '*\\/checkout*' }),
          }),
          expect.objectContaining({
            query_string: expect.objectContaining({ query: '*\\/cart*' }),
          }),
        ],
        minimum_should_match: 1,
      },
    });
  });
});
