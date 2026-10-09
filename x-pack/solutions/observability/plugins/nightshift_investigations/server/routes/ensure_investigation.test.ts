/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureInvestigationRoute } from './ensure_investigation';

const { handler, params } =
  ensureInvestigationRoute['POST /internal/nightshift/investigations/{id}/_ensure'];

const ensureOrCreate = jest.fn();
const getInvestigationsClient = jest.fn().mockReturnValue({ ensureOrCreate });

beforeEach(() => jest.clearAllMocks());

it('accepts a request without a body', () => {
  expect(params?.safeParse({ path: { id: 'exec-1' }, body: null }).success).toBe(true);
});

it('returns the conversation of a continued investigation', async () => {
  ensureOrCreate.mockResolvedValue('conv-1');

  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      params: { path: { id: 'inv-1' }, body: { execution_id: 'exec-2' } },
    } as never)
  ).resolves.toEqual({ acknowledged: true, conversation_id: 'conv-1' });
  expect(ensureOrCreate).toHaveBeenCalledWith('inv-1', 'exec-2');
});

it('returns no conversation for a new investigation', async () => {
  ensureOrCreate.mockResolvedValue(undefined);

  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      params: { path: { id: 'exec-1' }, body: { execution_id: 'exec-1' } },
    } as never)
  ).resolves.toEqual({ acknowledged: true });
});
