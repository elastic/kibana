/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { CaseStatuses } from '@kbn/cases-components';
import { createCasesClientMock } from '@kbn/cases-plugin/server/client/mocks';
import type { CasesBulkGetResponse } from '@kbn/cases-plugin/common/types/api';
import { fetchEntityCaseCounts } from './fetch_entity_case_counts';

/** A repository whose attachments aggregation answers with the case ids of each entity. */
const buildRepository = (caseIdsByEntity: Record<string, string[]>) => {
  const repository = savedObjectsRepositoryMock.create();
  repository.find.mockResolvedValue({
    saved_objects: [],
    total: 0,
    per_page: 1,
    page: 1,
    aggregations: {
      by_entity: {
        buckets: Object.entries(caseIdsByEntity).map(([key, caseIds]) => ({
          key,
          doc_count: caseIds.length,
          references: { cases: { buckets: caseIds.map((id) => ({ key: id, doc_count: 1 })) } },
        })),
      },
    },
  });
  return repository;
};

/** A cases client that knows the cases of `statuses`; other ids are errors, as when deleted. */
const buildCasesClient = (statuses: Record<string, CaseStatuses>) => {
  const casesClient = createCasesClientMock();
  casesClient.cases.bulkGet.mockImplementation(
    async ({ ids }) =>
      ({
        cases: ids.flatMap((id) => (statuses[id] ? [{ id, status: statuses[id] }] : [])),
        errors: [],
      } as unknown as CasesBulkGetResponse)
  );
  return casesClient;
};

describe('fetchEntityCaseCounts', () => {
  it('counts the open and in-progress cases of each entity, not the closed ones', async () => {
    const repository = buildRepository({
      'host:a': ['open', 'in-progress', 'closed'],
      'host:b': ['open'],
    });
    const casesClient = buildCasesClient({
      open: CaseStatuses.open,
      'in-progress': CaseStatuses['in-progress'],
      closed: CaseStatuses.closed,
    });

    const counts = await fetchEntityCaseCounts(repository, casesClient, 'default', [
      'host:a',
      'host:b',
    ]);

    expect(counts).toEqual(
      new Map([
        ['host:a', 2],
        ['host:b', 1],
      ])
    );
    // A case shared by entities is read once.
    expect(casesClient.cases.bulkGet).toHaveBeenCalledWith({
      ids: ['open', 'in-progress', 'closed'],
    });
  });

  it('leaves out an entity whose cases are all closed or missing', async () => {
    const repository = buildRepository({ 'host:a': ['closed', 'deleted'] });
    const casesClient = buildCasesClient({ closed: CaseStatuses.closed });

    const counts = await fetchEntityCaseCounts(repository, casesClient, 'default', ['host:a']);

    expect(counts).toEqual(new Map());
  });

  it('reads the cases in batches the cases client accepts', async () => {
    const caseIds = Array.from({ length: 2500 }, (_, i) => `case-${i}`);
    const repository = buildRepository({ 'host:a': caseIds });
    const casesClient = buildCasesClient(
      Object.fromEntries(caseIds.map((id) => [id, CaseStatuses.open]))
    );

    const counts = await fetchEntityCaseCounts(repository, casesClient, 'default', ['host:a']);

    expect(counts).toEqual(new Map([['host:a', 2500]]));
    expect(casesClient.cases.bulkGet.mock.calls.map(([{ ids }]) => ids.length)).toEqual([
      1000, 1000, 500,
    ]);
  });

  it('reads nothing without entity ids', async () => {
    const repository = buildRepository({});
    const casesClient = buildCasesClient({});

    expect(await fetchEntityCaseCounts(repository, casesClient, 'default', [])).toEqual(new Map());
    expect(repository.find).not.toHaveBeenCalled();
    expect(casesClient.cases.bulkGet).not.toHaveBeenCalled();
  });
});
