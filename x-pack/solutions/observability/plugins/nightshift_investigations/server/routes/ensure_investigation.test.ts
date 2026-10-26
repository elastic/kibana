/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvestigationNotFoundError } from '../client/errors';
import { ensureInvestigationRoute } from './ensure_investigation';

const { handler, params } =
  ensureInvestigationRoute['POST /internal/nightshift/investigations/{id}/_ensure'];

const ensureOrCreate = jest.fn();
const getInvestigationsClient = jest.fn().mockReturnValue({ ensureOrCreate });

beforeEach(() => jest.clearAllMocks());

it('accepts a request without a body', () => {
  expect(params?.safeParse({ path: { id: 'exec-1' }, body: null }).success).toBe(true);
});

it('returns the conversation of the investigation the run works on', async () => {
  ensureOrCreate.mockResolvedValue('inv-1');

  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      params: { path: { id: 'inv-1' }, body: { execution_id: 'exec-2' } },
    } as never)
  ).resolves.toEqual({ acknowledged: true, conversation_id: 'inv-1' });
  expect(ensureOrCreate).toHaveBeenCalledWith('inv-1', 'exec-2');
});

it('names the run itself when the body carries no execution id', async () => {
  ensureOrCreate.mockResolvedValue('exec-1');

  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      params: { path: { id: 'exec-1' }, body: null },
    } as never)
  ).resolves.toEqual({ acknowledged: true, conversation_id: 'exec-1' });
  expect(ensureOrCreate).toHaveBeenCalledWith('exec-1', undefined);
});

it('maps a run that does not name the investigation to 404', async () => {
  ensureOrCreate.mockRejectedValue(new InvestigationNotFoundError('inv-1'));

  await expect(
    handler({
      request: {},
      getInvestigationsClient,
      params: { path: { id: 'inv-1' }, body: { execution_id: 'exec-2' } },
    } as never)
  ).rejects.toMatchObject({ output: { statusCode: 404 } });
});
