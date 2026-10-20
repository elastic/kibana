/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { listAutomationsRoute } from './list_automations';
import { getAutomationRoute } from './get_automation';
import { createRouteContext } from './test_helpers';

const savedObject = (id: string, author?: string) => ({
  id,
  attributes: { name: id, ...(author ? { author } : {}) },
});

describe('list automations', () => {
  const { handler } = listAutomationsRoute['GET /internal/nightshift/automations'];

  it('returns the stored author, or System when missing', async () => {
    const find = jest.fn().mockResolvedValue({
      saved_objects: [savedObject('with-author', 'alice'), savedObject('without-author')],
      total: 2,
    });

    const result = await handler({
      request: httpServerMock.createKibanaRequest(),
      params: {},
      getAutomationsSoClient: jest.fn().mockReturnValue({ find }),
      context: createRouteContext(),
    } as never);

    expect(result).toEqual({
      automations: [
        expect.objectContaining({ id: 'with-author', author: 'alice' }),
        expect.objectContaining({ id: 'without-author', author: 'System' }),
      ],
      total: 2,
    });
  });
});

describe('get automation', () => {
  const { handler } = getAutomationRoute['GET /internal/nightshift/automations/{id}'];

  it('returns the automation with its stored author', async () => {
    const result = await handler({
      request: httpServerMock.createKibanaRequest(),
      params: { path: { id: 'automation-1' } },
      getAutomationsSoClient: jest
        .fn()
        .mockReturnValue({ get: jest.fn().mockResolvedValue(savedObject('automation-1', 'bob')) }),
      context: createRouteContext(),
    } as never);

    expect(result).toMatchObject({ id: 'automation-1', author: 'bob' });
  });
});
