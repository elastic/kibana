/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { createHttpEntityInventoryApiClient } from './http_client';
import type { InventoryListResponse, InventoryTypesResponse } from './types';

const TYPES_RESPONSE: InventoryTypesResponse = { types: [] };

const LIST_RESPONSE: InventoryListResponse = {
  columns: [{ name: 'entity.id', kind: 'id' }],
  rows: [{ 'entity.id': 'host:a' }],
  truncated: false,
  errors: [],
  unavailableColumns: [],
};

const setup = () => {
  const { http } = coreMock.createStart();
  const client = createHttpEntityInventoryApiClient(http);
  return { http, client };
};

describe('createHttpEntityInventoryApiClient', () => {
  it('reads the types from GET /internal/entity_inventory/types with the given signal', async () => {
    const { http, client } = setup();
    http.fetch.mockResolvedValue(TYPES_RESPONSE);
    const { signal } = new AbortController();

    await expect(client.getTypes({ signal })).resolves.toEqual(TYPES_RESPONSE);

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith(
      '/internal/entity_inventory/types',
      expect.objectContaining({ method: 'GET', signal, body: undefined })
    );
  });

  it('lists the entities of the type with a body of only from and to, and the given signal', async () => {
    const { http, client } = setup();
    http.fetch.mockResolvedValue(LIST_RESPONSE);
    const { signal } = new AbortController();
    const from = '2026-10-30T10:00:00.000Z';
    const to = '2026-10-30T10:15:00.000Z';

    await expect(client.getEntities('k8s.deployment', { from, to }, { signal })).resolves.toEqual(
      LIST_RESPONSE
    );

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith(
      '/internal/entity_inventory/entities/k8s.deployment/_list',
      expect.objectContaining({ method: 'POST', signal, body: JSON.stringify({ from, to }) })
    );
  });
});
