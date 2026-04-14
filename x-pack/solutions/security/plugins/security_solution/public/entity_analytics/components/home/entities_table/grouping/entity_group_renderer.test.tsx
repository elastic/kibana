/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RawBucket } from '@kbn/grouping';
import { createGroupPanelRenderer, createGroupStatsRenderer } from './entity_group_renderer';
import type { EntitiesGroupingAggregation, TargetMetadataMap } from './use_fetch_grouped_data';
import { EntityType } from '../../../../../../common/entity_analytics/types';
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

const emptyMetadata: TargetMetadataMap = new Map();

describe('createGroupPanelRenderer', () => {
  describe('ENTITY_TYPE group', () => {
    it('renders capitalized entity type', () => {
      const bucket = createMockBucket({ key: 'user' });
      const renderer = createGroupPanelRenderer(emptyMetadata);
      const element = renderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      const { getByText } = render(<>{element}</>);

      expect(getByText('User')).toBeInTheDocument();
    });

    it('prefers key_as_string over key when both are present', () => {
      const bucket = createMockBucket({ key: 'host', key_as_string: 'service' });
      const renderer = createGroupPanelRenderer(emptyMetadata);
      const element = renderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      const { getByText } = render(<>{element}</>);

      expect(getByText('Service')).toBeInTheDocument();
    });

    it('falls back to key.toString() when key_as_string is absent', () => {
      const bucket = createMockBucket({ key: 'host' });
      delete (bucket as unknown as Record<string, unknown>).key_as_string;
      const renderer = createGroupPanelRenderer(emptyMetadata);
      const element = renderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      const { getByText } = render(<>{element}</>);

      expect(getByText('Host')).toBeInTheDocument();
    });
  });

  describe('RESOLUTION group', () => {
    it('renders target entity name from metadata', () => {
      const metadata: TargetMetadataMap = new Map([
        ['target-entity-id', { name: 'bernicehuel', type: EntityType.user, riskScore: null }],
      ]);
      const bucket = createMockBucket({ key: 'target-entity-id' });
      const renderer = createGroupPanelRenderer(metadata);
      const element = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      const { getByText } = render(<>{element}</>);

      expect(getByText('bernicehuel')).toBeInTheDocument();
    });

    it('falls back to bucket key when metadata is not available', () => {
      const bucket = createMockBucket({
        key: 'fallback-entity-id',
        key_as_string: 'fallback-entity-id',
      });
      const renderer = createGroupPanelRenderer(emptyMetadata);
      const element = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      const { getByText } = render(<>{element}</>);

      expect(getByText('fallback-entity-id')).toBeInTheDocument();
    });

    it('renders expand button when metadata has name and type', () => {
      const metadata: TargetMetadataMap = new Map([
        ['target-id', { name: 'test-entity', type: EntityType.user, riskScore: null }],
      ]);
      const bucket = createMockBucket({ key: 'target-id' });
      const renderer = createGroupPanelRenderer(metadata);
      const element = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<>{element}</>);

      expect(screen.getByLabelText('Open entity details')).toBeInTheDocument();
    });

    it('hides expand button when metadata is not available', () => {
      const bucket = createMockBucket({
        key: 'fallback-entity-id',
      });
      const renderer = createGroupPanelRenderer(emptyMetadata);
      const element = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<>{element}</>);

      expect(screen.queryByLabelText('Open entity details')).not.toBeInTheDocument();
      expect(screen.getByText('fallback-entity-id')).toBeInTheDocument();
    });

    it('updates from entity ID to target name when metadata arrives after grouping data', () => {
      const bucket = createMockBucket({ key: 'target-id' });

      // Phase 1: grouping data arrived, metadata still loading — shows entity ID
      const rendererBefore = createGroupPanelRenderer(emptyMetadata);
      const { rerender } = render(
        <>{rendererBefore(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket)}</>
      );
      expect(screen.getByText('target-id')).toBeInTheDocument();
      expect(screen.queryByLabelText('Open entity details')).not.toBeInTheDocument();

      // Phase 2: metadata arrived — new renderer shows target name + flyout button
      const metadata: TargetMetadataMap = new Map([
        ['target-id', { name: 'alice-target', type: EntityType.user, riskScore: 85.0 }],
      ]);
      const rendererAfter = createGroupPanelRenderer(metadata);
      rerender(<>{rendererAfter(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket)}</>);
      expect(screen.getByText('alice-target')).toBeInTheDocument();
      expect(screen.queryByText('target-id')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Open entity details')).toBeInTheDocument();
    });
  });

  it('returns undefined for unknown group types', () => {
    const bucket = createMockBucket();
    const renderer = createGroupPanelRenderer(emptyMetadata);
    const result = renderer('some.other.field', bucket);

    expect(result).toBeUndefined();
  });
});

describe('createGroupStatsRenderer', () => {
  describe('entity count (all group types)', () => {
    it('returns badge with doc_count when doc_count > 0', () => {
      const bucket = createMockBucket({ doc_count: 42 });
      const renderer = createGroupStatsRenderer(emptyMetadata);
      const stats = renderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      expect(stats).toHaveLength(1);
      expect(stats[0].title).toBe('Entities:');
      expect(stats[0].badge).toEqual({ value: 42, width: 50 });
    });

    it('returns empty array when doc_count is 0', () => {
      const bucket = createMockBucket({ doc_count: 0 });
      const renderer = createGroupStatsRenderer(emptyMetadata);
      const stats = renderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      expect(stats).toHaveLength(0);
    });
  });

  describe('RESOLUTION group', () => {
    it('returns entities count + risk score stats (2 items)', () => {
      const metadata: TargetMetadataMap = new Map([
        ['target-id', { name: 'test', type: EntityType.user, riskScore: 85.42 }],
      ]);
      const bucket = createMockBucket({ key: 'target-id', doc_count: 4 });
      const renderer = createGroupStatsRenderer(metadata);
      const stats = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      expect(stats).toHaveLength(2);
      expect(stats[0].title).toBe('Entities:');
      expect(stats[1].title).toBe('Risk score:');
    });

    it('risk score badge shows value from metadata', () => {
      const metadata: TargetMetadataMap = new Map([
        ['target-id', { name: 'test', type: EntityType.user, riskScore: 73.1829 }],
      ]);
      const bucket = createMockBucket({ key: 'target-id', doc_count: 3 });
      const renderer = createGroupStatsRenderer(metadata);
      const stats = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<TestProviders>{stats[1].component}</TestProviders>);

      expect(screen.getByText('73.18')).toBeInTheDocument();
    });

    it('risk score falls back to bucket aggregation when metadata is unavailable', () => {
      const bucket = createMockBucket({
        key: 'target-id',
        doc_count: 3,
        resolutionRiskScore: { value: 65.5 },
      });
      const renderer = createGroupStatsRenderer(emptyMetadata);
      const stats = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<TestProviders>{stats[1].component}</TestProviders>);

      expect(screen.getByText('65.50')).toBeInTheDocument();
    });

    it('risk score badge shows en-dash when both metadata and bucket score are null', () => {
      const metadata: TargetMetadataMap = new Map([
        ['target-id', { name: 'test', type: EntityType.user, riskScore: null }],
      ]);
      const bucket = createMockBucket({ key: 'target-id', doc_count: 1 });
      const renderer = createGroupStatsRenderer(metadata);
      const stats = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      render(<TestProviders>{stats[1].component}</TestProviders>);

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('risk score stat is present even when no metadata or bucket score exists', () => {
      const bucket = createMockBucket({ key: 'unknown-id', doc_count: 2 });
      const renderer = createGroupStatsRenderer(emptyMetadata);
      const stats = renderer(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);

      expect(stats).toHaveLength(2);

      render(<TestProviders>{stats[1].component}</TestProviders>);

      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('updates risk score from en-dash to actual value when metadata arrives after grouping data', () => {
      const bucket = createMockBucket({ key: 'target-id', doc_count: 3 });

      // Phase 1: no metadata — shows en-dash
      const rendererBefore = createGroupStatsRenderer(emptyMetadata);
      const statsBefore = rendererBefore(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);
      const { rerender } = render(<TestProviders>{statsBefore[1].component}</TestProviders>);
      expect(screen.getByText('—')).toBeInTheDocument();

      // Phase 2: metadata arrived — shows actual risk score
      const metadata: TargetMetadataMap = new Map([
        ['target-id', { name: 'test', type: EntityType.user, riskScore: 92.5 }],
      ]);
      const rendererAfter = createGroupStatsRenderer(metadata);
      const statsAfter = rendererAfter(ENTITY_GROUPING_OPTIONS.RESOLUTION, bucket);
      rerender(<TestProviders>{statsAfter[1].component}</TestProviders>);
      expect(screen.getByText('92.50')).toBeInTheDocument();
    });
  });

  describe('ENTITY_TYPE group', () => {
    it('does not include risk score stat', () => {
      const bucket = createMockBucket({ doc_count: 10 });
      const renderer = createGroupStatsRenderer(emptyMetadata);
      const stats = renderer(ENTITY_GROUPING_OPTIONS.ENTITY_TYPE, bucket);

      expect(stats).toHaveLength(1);
      expect(stats[0].title).toBe('Entities:');
    });
  });
});
