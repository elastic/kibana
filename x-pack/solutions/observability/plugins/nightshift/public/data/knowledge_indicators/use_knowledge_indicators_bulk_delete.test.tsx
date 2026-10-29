/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import { BULK_WRITE_CONFLICT_MESSAGE } from '../../common/errors';
import type { BulkOperationResult } from './use_discovery_features_api';
import { useKnowledgeIndicatorsBulkDelete } from './use_knowledge_indicators_bulk_delete';

const mockToasts = {
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addError: jest.fn(),
};
const mockFetch = jest.fn();
const mockDeleteFeaturesInBulk = jest.fn<Promise<BulkOperationResult>, []>();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: mockToasts },
      significantEvents: { significantEventsRepositoryClient: { fetch: mockFetch } },
    },
  }),
}));

jest.mock('./use_discovery_features_api', () => ({
  ...jest.requireActual('./use_discovery_features_api'),
  useDiscoveryFeaturesApi: () => ({ deleteFeaturesInBulk: mockDeleteFeaturesInBulk }),
}));

const featureKI = (id: string): KnowledgeIndicator => ({
  kind: 'feature',
  feature: {
    id,
    uuid: `uuid-${id}`,
    source_id: 'logs.test',
    type: 'entity',
    description: '',
    properties: {},
    confidence: 80,
  },
});

const queryKI = (id: string): KnowledgeIndicator => ({
  kind: 'query',
  query: {
    id,
    type: 'match',
    title: id,
    description: '',
    esql: { query: `FROM logs-* | WHERE id == "${id}"` },
    severity_score: 50,
  },
  rule: { backed: false, id: `rule-${id}` },
  source_id: 'logs.test',
});

const givenFeatureResult = (result: BulkOperationResult) =>
  mockDeleteFeaturesInBulk.mockResolvedValue(result);

/** Retries and logging are off, since some cases reject on purpose. */
const renderBulkDelete = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return renderHook(() => useKnowledgeIndicatorsBulkDelete(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe('useKnowledgeIndicatorsBulkDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds that the source was busy to the partial warning when deletes hit a conflict', async () => {
    givenFeatureResult({ succeededCount: 1, failedCount: 0, conflictCount: 1 });
    mockFetch.mockResolvedValue({ succeeded: 1, failed: 0 });
    const { result } = renderBulkDelete();

    await act(() =>
      result.current.deleteKnowledgeIndicatorsInBulk([
        featureKI('a'),
        featureKI('b'),
        queryKI('q1'),
      ])
    );

    expect(mockToasts.addWarning).toHaveBeenCalledWith({
      title: '2 knowledge indicators deleted. 1 knowledge indicator failed.',
      text: BULK_WRITE_CONFLICT_MESSAGE,
    });
  });

  it('shows the partial warning without the busy text when deletes fail for another reason', async () => {
    givenFeatureResult({ succeededCount: 1, failedCount: 1, conflictCount: 0 });
    const { result } = renderBulkDelete();

    await act(() =>
      result.current.deleteKnowledgeIndicatorsInBulk([featureKI('a'), featureKI('b')])
    );

    expect(mockToasts.addWarning).toHaveBeenCalledWith({
      title: '1 knowledge indicator deleted. 1 knowledge indicator failed.',
      text: undefined,
    });
  });

  it('reports the source was busy as an error when nothing was deleted because of a conflict', async () => {
    givenFeatureResult({ succeededCount: 0, failedCount: 0, conflictCount: 2 });
    const { result } = renderBulkDelete();

    await act(async () => {
      await expect(
        result.current.deleteKnowledgeIndicatorsInBulk([featureKI('a'), featureKI('b')])
      ).rejects.toThrow(BULK_WRITE_CONFLICT_MESSAGE);
    });

    expect(mockToasts.addError).toHaveBeenCalledWith(new Error(BULK_WRITE_CONFLICT_MESSAGE), {
      title: 'Failed to delete selected knowledge indicators',
    });
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
  });

  it('does not blame a busy source when nothing was deleted and other items failed for another reason', async () => {
    givenFeatureResult({ succeededCount: 0, failedCount: 0, conflictCount: 1 });
    mockFetch.mockResolvedValue({ succeeded: 0, failed: 1 });
    const { result } = renderBulkDelete();

    await act(async () => {
      await expect(
        result.current.deleteKnowledgeIndicatorsInBulk([featureKI('a'), queryKI('q1')])
      ).rejects.toThrow('Some knowledge indicators could not be deleted');
    });
  });
});
