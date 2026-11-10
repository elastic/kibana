/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_SOURCES_PER_PAGE,
  type ListSourcesResponse,
  type NightshiftSource,
} from '@kbn/nightshift-shared';
import type { SourcesClient } from './sources_client';
import { SourcesRecommendationService } from './sources_recommendation_service';

const makeSource = (esql: string, overrides: Partial<NightshiftSource> = {}): NightshiftSource => ({
  id: 'source-1',
  title: 'Existing source',
  tags: [],
  esql,
  type: 'logs',
  slug: 'existing-source',
  view_name: '$.nightshift.sources.default.existing-source',
  enabled: true,
  created_by: 'tester',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const makeListResponse = (
  sources: NightshiftSource[],
  { total = sources.length, page = 1 }: { total?: number; page?: number } = {}
): ListSourcesResponse => ({
  sources,
  total,
  page,
  per_page: MAX_SOURCES_PER_PAGE,
});

const setup = () => {
  type ListSources = SourcesClient['list'];
  const list = jest.fn<ReturnType<ListSources>, Parameters<ListSources>>();
  const service = new SourcesRecommendationService({ list });
  return { list, service };
};

describe('SourcesRecommendationService', () => {
  it('includes the All logs preset when the space has no sources', async () => {
    const { list, service } = setup();
    list.mockResolvedValue(makeListResponse([]));

    const recommendations = await service.list();

    expect(recommendations).toContainEqual(
      expect.objectContaining({ id: 'logs', title: 'All logs', tags: ['logs'] })
    );
  });

  it('hides the All logs preset when a source has the same semantic query', async () => {
    const { list, service } = setup();
    list.mockResolvedValue(makeListResponse([makeSource('from   logs*')]));

    const recommendations = await service.list();

    expect(recommendations.some(({ id }) => id === 'logs')).toBe(false);
  });

  it('hides the All logs preset when the matching source is disabled', async () => {
    const { list, service } = setup();
    list.mockResolvedValue(makeListResponse([makeSource('FROM logs*', { enabled: false })]));

    const recommendations = await service.list();

    expect(recommendations.some(({ id }) => id === 'logs')).toBe(false);
  });

  it('finds a matching source on a later page', async () => {
    const { list, service } = setup();
    const unrelatedSources = Array.from({ length: MAX_SOURCES_PER_PAGE }, (_, index) =>
      makeSource(`FROM unrelated-${index}`, { id: `source-${index}` })
    );
    const total = MAX_SOURCES_PER_PAGE + 1;
    list
      .mockResolvedValueOnce(makeListResponse(unrelatedSources, { total }))
      .mockResolvedValueOnce(makeListResponse([makeSource('FROM logs*')], { total, page: 2 }));

    const recommendations = await service.list();

    expect(recommendations.some(({ id }) => id === 'logs')).toBe(false);
  });
});
