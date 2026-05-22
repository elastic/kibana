/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useOverviewTabData } from './use_overview_tab_data';

const buildHit = (flattened: Record<string, unknown>): DataTableRecord => ({
  id: 'attack-1',
  raw: { _id: 'attack-1', _index: '.alerts', _source: {} },
  flattened,
});

describe('useOverviewTabData', () => {
  it('returns the markdown bundles from hit.flattened', () => {
    const hit = buildHit({
      'kibana.alert.attack_discovery.summary_markdown': 'summary',
      'kibana.alert.attack_discovery.summary_markdown_with_replacements': 'summary w/ replacements',
      'kibana.alert.attack_discovery.details_markdown': 'details',
      'kibana.alert.attack_discovery.details_markdown_with_replacements': 'details w/ replacements',
    });

    const { result } = renderHook(() => useOverviewTabData(hit));

    expect(result.current).toEqual({
      summaryMarkdown: 'summary',
      summaryMarkdownWithReplacements: 'summary w/ replacements',
      detailsMarkdown: 'details',
      detailsMarkdownWithReplacements: 'details w/ replacements',
    });
  });

  it('falls back to empty strings when fields are missing', () => {
    const hit = buildHit({});

    const { result } = renderHook(() => useOverviewTabData(hit));

    expect(result.current).toEqual({
      summaryMarkdown: '',
      summaryMarkdownWithReplacements: '',
      detailsMarkdown: '',
      detailsMarkdownWithReplacements: '',
    });
  });

  it('unwraps single-element arrays via getFieldValue', () => {
    const hit = buildHit({
      'kibana.alert.attack_discovery.summary_markdown': ['summary'],
      'kibana.alert.attack_discovery.summary_markdown_with_replacements': [],
    });

    const { result } = renderHook(() => useOverviewTabData(hit));

    expect(result.current.summaryMarkdown).toBe('summary');
    expect(result.current.summaryMarkdownWithReplacements).toBe('');
  });
});
