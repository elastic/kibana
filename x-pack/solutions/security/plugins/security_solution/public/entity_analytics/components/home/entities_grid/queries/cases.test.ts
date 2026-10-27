/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { QueryArgs, Row } from '../common';
import { ENTITY_CASE_COUNTS_INTERNAL_URL } from '../../../../../../common/entity_analytics/entity_analytics/constants';
import { caseCountQuerySpec } from './cases';

const ARGS: QueryArgs = {
  namespace: 'default',
  timeRange: '30d',
  sort: { field: 'case_count', direction: 'desc' },
  pageSize: 2,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const ROWS: Row[] = [{ 'entity.id': 'host:h1' }, { 'entity.id': 'user:a' }];

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
  });

const enrichWith = (post: () => Promise<unknown>) => {
  const http = httpServiceMock.createSetupContract();
  http.post.mockImplementation(post);
  return caseCountQuerySpec.enricher.fetch(ROWS, ARGS, { runQuery: jest.fn(async () => []), http });
};

const enrichRows = async (args: QueryArgs) => {
  const http = httpServiceMock.createSetupContract();
  http.post.mockResolvedValue({ 'host:h1': 3 });
  const fields = await caseCountQuerySpec.enricher.fetch(ROWS, args, {
    runQuery: jest.fn(async () => []),
    http,
  });
  return { fields, http };
};

describe('case count enricher', () => {
  it('counts the cases of every row, zero when an entity has none', async () => {
    const fields = await enrichWith(async () => ({ 'host:h1': 2 }));

    expect(fields).toEqual(
      new Map([
        ['host:h1', { case_count: 2 }],
        ['user:a', { case_count: 0 }],
      ])
    );
  });

  describe('for the groups of resolved rows', () => {
    it('asks the server to count the distinct cases of the members of each group', async () => {
      const { fields, http } = await enrichRows(ARGS);

      expect(http.post).toHaveBeenCalledWith(
        ENTITY_CASE_COUNTS_INTERNAL_URL,
        expect.objectContaining({
          body: JSON.stringify({ entity_ids: ['host:h1', 'user:a'], include_members: true }),
        })
      );
      expect(fields.get('host:h1')).toEqual({ case_count: 3 });
    });

    it('counts the cases of the entities themselves for individual rows', async () => {
      const { http } = await enrichRows({ ...ARGS, rowsMode: 'individual' });

      expect(http.post).toHaveBeenCalledWith(
        ENTITY_CASE_COUNTS_INTERNAL_URL,
        expect.objectContaining({ body: JSON.stringify({ entity_ids: ['host:h1', 'user:a'] }) })
      );
    });
  });

  it('leaves the counts unset when the user cannot read Security cases', async () => {
    const fields = await enrichWith(async () => Promise.reject(httpError(403)));

    expect(fields).toEqual(new Map());
  });

  it('fails on other errors', async () => {
    await expect(enrichWith(async () => Promise.reject(httpError(500)))).rejects.toThrow(
      'HTTP 500'
    );
  });
});
