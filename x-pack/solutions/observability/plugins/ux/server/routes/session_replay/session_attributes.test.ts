/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathFromAnyHits } from './session_attributes';

describe('pagePathFromAnyHits', () => {
  it('builds a trail from fetch-span URLs when there is no page view', () => {
    expect(
      pagePathFromAnyHits([
        {
          _source: {
            name: 'POST',
            attributes: {
              'url.path.grouped': '/app/ux/kibana-pr-284540/*',
              'page.url.path': '/app/ux/kibana-pr-284540/session-replay',
            },
          },
        },
        {
          _source: {
            name: 'GET',
            attributes: {
              'url.path.grouped': '/app/management/kibana/*',
              'page.url.path': '/app/management/kibana/settings',
            },
          },
        },
      ])
    ).toEqual(['app/ux/kibana-pr-284540/*', 'app/management/kibana/*']);
  });

  it('skips asset paths and consecutive duplicates', () => {
    expect(
      pagePathFromAnyHits([
        {
          _source: {
            attributes: { 'page.url.path': '/app/ux/kibana-pr-284540/session-replay' },
          },
        },
        {
          _source: {
            attributes: { 'page.url.path': '/app/ux/kibana-pr-284540/session-replay' },
          },
        },
        {
          _source: {
            attributes: { 'page.url.path': '/bundles/core/core.entry.js' },
          },
        },
      ])
    ).toEqual(['app/ux/kibana-pr-284540/session-replay']);
  });

  it('returns empty when hits have no URL', () => {
    expect(pagePathFromAnyHits([{ _source: { name: 'POST' } }])).toEqual([]);
  });
});
