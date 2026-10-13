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
  cursor: null,
  pageSize: 2,
  rowsMode: 'resolved',
  concreteEntityIndexName: '.entities.v2.latest.default-00001',
  anomalyJobIds: [],
};

const ROWS: Row[] = [{ 'entity.id': 'host:h1' }, { 'entity.id': 'user:a' }];

/** An error as `http.post` rejects with on an HTTP error status. */
const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
  });

/** Enriches the rows with the route answering as `post` does, for rows without group members. */
const enrichWith = (post: () => Promise<unknown>) => {
  const http = httpServiceMock.createSetupContract();
  http.post.mockImplementation(post);
  return caseCountQuerySpec.enricher.fetch(ROWS, ARGS, { runQuery: jest.fn(async () => []), http });
};

/** Enriches the rows of `args`, with the entity docs of the group members the query returns. */
const enrichGroups = async (args: QueryArgs, members: Row[]) => {
  const http = httpServiceMock.createSetupContract();
  http.post.mockResolvedValue({ 'host:h1': 3 });
  const runQuery = jest.fn(async () => members);
  const fields = await caseCountQuerySpec.enricher.fetch(ROWS, args, { runQuery, http });
  return { fields, http, runQuery };
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
    const MEMBERS: Row[] = [
      { 'entity.id': 'host:a1', 'entity.relationships.resolution.resolved_to': 'host:h1' },
      { 'entity.id': 'host:a2', 'entity.relationships.resolution.resolved_to': 'host:h1' },
    ];

    it('sends the members of each group, for the server to count their distinct cases', async () => {
      const { fields, http } = await enrichGroups(ARGS, MEMBERS);

      expect(http.post).toHaveBeenCalledWith(
        ENTITY_CASE_COUNTS_INTERNAL_URL,
        expect.objectContaining({
          body: JSON.stringify({
            entity_ids: ['host:h1', 'user:a'],
            member_ids: { 'host:h1': ['host:a1', 'host:a2'] },
          }),
        })
      );
      expect(fields.get('host:h1')).toEqual({ case_count: 3 });
    });

    it('sends no members when no group has aliases', async () => {
      const { http } = await enrichGroups(ARGS, []);

      expect(http.post).toHaveBeenCalledWith(
        ENTITY_CASE_COUNTS_INTERNAL_URL,
        expect.objectContaining({ body: JSON.stringify({ entity_ids: ['host:h1', 'user:a'] }) })
      );
    });

    it('reads no members for individual rows', async () => {
      const { http, runQuery } = await enrichGroups({ ...ARGS, rowsMode: 'individual' }, MEMBERS);

      expect(runQuery).not.toHaveBeenCalled();
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
