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
import { ENTITY_GROUPING_OPTIONS } from '../constants';
import { TestProviders } from '../../../../../common/mock';

const mockOpenRightPanel = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openRightPanel: mockOpenRightPanel,
    closeFlyout: jest.fn(),
  }),
}));

const createMockBucket = (
  overrides: Partial<RawBucket<EntitiesGroupingAggregation>> = {}
): RawBucket<EntitiesGroupingAggregation> =>
  ({
    key: 'user',
    doc_count: 10,
    ...overrides,
  } as RawBucket<EntitiesGroupingAggregation>);

describe('groupPanelRenderer', () => {
  describe('ENTITY_TYPE group', () => {
    it('renders capitalized entity type', () => {
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
      delete (bucket as unknown as Record<string, unknown>).key_as_string;
      const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      const { getByText } = render(<>{element}</>);

      expect(getByText('Host')).toBeInTheDocument();
    });
  });

  describe('RESOLUTION group', () => {
    it('renders target entity name from resolutionEntityName sub-aggregation', () => {
      const bucket = createMockBucket({
        key: 'target-entity-id',
        resolutionEntityName: {
          doc_count: 1,
          name: { buckets: [{ key: 'bernicehuel', doc_count: 1 }] },
        },
      });
      const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      const { getByText } = render(<>{element}</>);

      expect(getByText('bernicehuel')).toBeInTheDocument();
    });

    it('falls back to bucket key when resolutionEntityName has no buckets', () => {
      const bucket = createMockBucket({
        key: 'fallback-entity-id',
        key_as_string: 'fallback-entity-id',
        resolutionEntityName: {
          doc_count: 0,
          name: { buckets: [] },
        },
      });
      const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      const { getByText } = render(<>{element}</>);

      expect(getByText('fallback-entity-id')).toBeInTheDocument();
    });

    it('renders expand button when entity type is available', () => {
      const bucket = createMockBucket({
        key: 'target-id',
        resolutionEntityName: {
          doc_count: 1,
          name: { buckets: [{ key: 'test-entity', doc_count: 1 }] },
        },
        resolutionEntityType: {
          doc_count: 1,
          type: { buckets: [{ key: 'user', doc_count: 1 }] },
        },
      });
      const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<>{element}</>);

      expect(screen.getByLabelText('Open entity details')).toBeInTheDocument();
    });

    it('hides expand button when target entity name is not available', () => {
      const bucket = createMockBucket({
        key: 'fallback-entity-id',
        resolutionEntityName: {
          doc_count: 0,
          name: { buckets: [] },
        },
        resolutionEntityType: {
          doc_count: 1,
          type: { buckets: [{ key: 'user', doc_count: 1 }] },
        },
      });
      const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<>{element}</>);

      expect(screen.queryByLabelText('Open entity details')).not.toBeInTheDocument();
      expect(screen.getByText('fallback-entity-id')).toBeInTheDocument();
    });

    it('hides expand button when entity type is not available', () => {
      const bucket = createMockBucket({
        key: 'target-id',
        resolutionEntityName: {
          doc_count: 1,
          name: { buckets: [{ key: 'test-entity', doc_count: 1 }] },
        },
        resolutionEntityType: {
          doc_count: 0,
          type: { buckets: [] },
        },
      });
      const element = groupPanelRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<>{element}</>);

      expect(screen.queryByLabelText('Open entity details')).not.toBeInTheDocument();
    });
  });

  it('returns undefined for unknown group types', () => {
    const bucket = createMockBucket();
    const result = groupPanelRenderer('some.other.field', bucket);

    expect(result).toBeUndefined();
  });
});

describe('groupStatsRenderer', () => {
  describe('entity count (all group types)', () => {
    it('returns badge with doc_count when doc_count > 0', () => {
      const bucket = createMockBucket({ doc_count: 42 });
      const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      expect(stats).toHaveLength(1);
      expect(stats[0].title).toBe('Entities:');
      expect(stats[0].badge).toEqual({ value: 42, width: 50 });
    });

    it('returns empty array when doc_count is 0', () => {
      const bucket = createMockBucket({ doc_count: 0 });
      const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      expect(stats).toHaveLength(0);
    });
  });

  describe('RESOLUTION group', () => {
    it('returns entities count + risk score stats (2 items)', () => {
      const bucket = createMockBucket({
        doc_count: 4,
        resolutionRiskScore: { value: 85.42 },
      });
      const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      expect(stats).toHaveLength(2);
      expect(stats[0].title).toBe('Entities:');
      expect(stats[1].title).toBe('Risk score:');
    });

    it('risk score badge shows formatted score value', () => {
      const bucket = createMockBucket({
        doc_count: 3,
        resolutionRiskScore: { value: 73.1829 },
      });
      const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<TestProviders>{stats[1].component}</TestProviders>);

      expect(screen.getByText('73.18')).toBeInTheDocument();
    });

    it('risk score badge shows en-dash for null score', () => {
      const bucket = createMockBucket({
        doc_count: 1,
        resolutionRiskScore: { value: null },
      });
      const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<TestProviders>{stats[1].component}</TestProviders>);

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('risk score stat is present even when resolutionRiskScore is undefined', () => {
      const bucket = createMockBucket({ doc_count: 2 });
      const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      expect(stats).toHaveLength(2);

      render(<TestProviders>{stats[1].component}</TestProviders>);

      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('ENTITY_TYPE group', () => {
    it('does not include risk score stat', () => {
      const bucket = createMockBucket({ doc_count: 10 });
      const stats = groupStatsRenderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      expect(stats).toHaveLength(1);
      expect(stats[0].title).toBe('Entities:');
    });
  });
});
