/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RawBucket } from '@kbn/grouping';
import { groupPanelRenderer, groupStatsRenderer } from './entity_group_renderer';
import type { EntitiesGroupingAggregation } from './use_fetch_grouped_data';
import { ENTITY_GROUPING_OPTIONS, TEST_SUBJ_GROUPING_COUNTER } from '../constants';

const createMockBucket = (
  overrides: Partial<RawBucket<EntitiesGroupingAggregation>> = {}
): RawBucket<EntitiesGroupingAggregation> =>
  ({
    key: 'user',
    doc_count: 10,
    ...overrides,
  } as RawBucket<EntitiesGroupingAggregation>);

describe('groupPanelRenderer', () => {
  it('renders capitalized entity type for ENTITY_TYPE group', () => {
    const bucket = createMockBucket({ key: 'user' });
    const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

    const { getByText } = render(<>{element}</>);

    expect(getByText('User')).toBeInTheDocument();
  });

  it('prefers key_as_string over key when both are present', () => {
    const bucket = createMockBucket({ key: 'host', key_as_string: 'service' });
    const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

    const { getByText } = render(<>{element}</>);

    expect(getByText('Service')).toBeInTheDocument();
  });

  it('falls back to key.toString() when key_as_string is absent', () => {
    const bucket = createMockBucket({ key: 'host' });
    delete (bucket as Record<string, unknown>).key_as_string;
    const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

    const { getByText } = render(<>{element}</>);

    expect(getByText('Host')).toBeInTheDocument();
  });

  it('returns undefined for unknown group types', () => {
    const bucket = createMockBucket();
    const result = groupPanelRenderer('some.other.field', bucket);

    expect(result).toBeUndefined();
  });
});

describe('groupStatsRenderer', () => {
  it('returns stats array with doc_count badge when doc_count > 0', () => {
    const bucket = createMockBucket({ doc_count: 42 });
    const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

    expect(stats).toHaveLength(1);
    expect(stats[0].title).toBe('Entities');

    render(<>{stats[0].component}</>);
    expect(screen.getByTestId(TEST_SUBJ_GROUPING_COUNTER)).toHaveTextContent('42');
  });

  it('returns empty array when doc_count is 0', () => {
    const bucket = createMockBucket({ doc_count: 0 });
    const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

    expect(stats).toHaveLength(0);
  });

  it('badge uses the correct test subject', () => {
    const bucket = createMockBucket({ doc_count: 5 });
    const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

    render(<>{stats[0].component}</>);
    expect(screen.getByTestId(TEST_SUBJ_GROUPING_COUNTER)).toBeInTheDocument();
  });

  it('tooltip includes the count value', () => {
    const bucket = createMockBucket({ doc_count: 7 });
    const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

    render(<>{stats[0].component}</>);
    expect(screen.getByTestId(TEST_SUBJ_GROUPING_COUNTER).closest('[aria-label]') ?? screen.getByTestId(TEST_SUBJ_GROUPING_COUNTER)).toBeInTheDocument();
  });
});
