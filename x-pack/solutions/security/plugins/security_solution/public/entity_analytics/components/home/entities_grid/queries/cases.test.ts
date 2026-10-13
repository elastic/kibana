/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { QueryArgs, Row } from '../common';
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

/** Enriches the rows with the route answering as `post` does. */
const enrichWith = (post: Promise<unknown>) => {
  const http = httpServiceMock.createSetupContract();
  http.post.mockReturnValue(post);
  return caseCountQuerySpec.enricher.fetch(ROWS, ARGS, { runQuery: jest.fn(), http });
};

describe('case count enricher', () => {
  it('counts the cases of every row, zero when an entity has none', async () => {
    const fields = await enrichWith(Promise.resolve({ 'host:h1': 2 }));

    expect(fields).toEqual(
      new Map([
        ['host:h1', { case_count: 2 }],
        ['user:a', { case_count: 0 }],
      ])
    );
  });

  it('leaves the counts unset when the user cannot read Security cases', async () => {
    const fields = await enrichWith(Promise.reject(httpError(403)));

    expect(fields).toEqual(new Map());
  });

  it('fails on other errors', async () => {
    await expect(enrichWith(Promise.reject(httpError(500)))).rejects.toThrow('HTTP 500');
  });
});
