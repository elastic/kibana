/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { GraphPreviewContainer } from './graph_preview_container';
import { useGraphPreviewData } from '../../graph/hooks/use_graph_preview_data';
import { GraphPreviewContainer as SharedGraphPreviewContainer } from '../../../flyout/shared/components/graph_preview_container';

jest.mock('../../graph/hooks/use_graph_preview_data');
jest.mock('../../../flyout/shared/components/graph_preview_container', () => ({
  GraphPreviewContainer: jest.fn(() => <div data-test-subj="sharedGraphPreviewContainerMock" />),
}));

const mockUseGraphPreviewData = jest.mocked(useGraphPreviewData);
const mockSharedGraphPreviewContainer = jest.mocked(SharedGraphPreviewContainer);

const createMockHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'index-1', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('GraphPreviewContainer (flyout v2)', () => {
  const onShowGraph = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards graph parameters in event mode to the shared container', () => {
    mockUseGraphPreviewData.mockReturnValue({
      eventIds: ['event-id'],
      timestamp: '2025-01-01T00:00:00.000Z',
      actorIds: ['alice'],
      targetIds: ['bob'],
      action: ['process-started'],
      isAlert: true,
      hasGraphData: true,
      shouldShowGraph: true,
    });

    render(<GraphPreviewContainer hit={createMockHit({})} onShowGraph={onShowGraph} />);

    const lastProps = mockSharedGraphPreviewContainer.mock.calls.at(-1)?.[0];
    expect(lastProps).toMatchObject({
      mode: 'event',
      shouldShowGraph: true,
      isAlert: true,
      timestamp: '2025-01-01T00:00:00.000Z',
      eventIds: ['event-id'],
      indexName: 'index-1',
      isPreviewMode: false,
      isRulePreview: false,
      onExpandGraph: onShowGraph,
    });
  });

  it('falls back to a synthesized timestamp when the document has none', () => {
    mockUseGraphPreviewData.mockReturnValue({
      eventIds: [],
      timestamp: null,
      actorIds: [],
      targetIds: [],
      action: [],
      isAlert: false,
      hasGraphData: false,
      shouldShowGraph: false,
    });

    render(<GraphPreviewContainer hit={createMockHit({})} onShowGraph={onShowGraph} />);

    const lastProps = mockSharedGraphPreviewContainer.mock.calls.at(-1)?.[0];
    expect(lastProps).toMatchObject({
      mode: 'event',
      shouldShowGraph: false,
      eventIds: [],
      timestamp: expect.any(String),
    });
  });
});
