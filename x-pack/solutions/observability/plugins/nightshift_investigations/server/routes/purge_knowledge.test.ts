/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { previewKnowledgePurgeRoute, purgeKnowledgeRoute } from './purge_knowledge';

const preview = previewKnowledgePurgeRoute['GET /internal/nightshift/knowledge/purge/preview'];
const purge = purgeKnowledgeRoute['POST /internal/nightshift/knowledge/purge'];

const SINCE = '2026-01-10T00:00:00.000Z';

const resources = () => {
  const client = {
    preview: jest.fn().mockResolvedValue({ since: SINCE }),
    purge: jest.fn().mockResolvedValue({ since: SINCE }),
  };
  return { client, getKnowledgePurgeClient: () => client, request: {} };
};

describe('knowledge purge routes', () => {
  it('previews with the requested cutoff', async () => {
    const { client, ...deps } = resources();

    await expect(
      preview.handler({ ...deps, params: { query: { since: SINCE } } } as never)
    ).resolves.toEqual({ since: SINCE });
    expect(client.preview).toHaveBeenCalledWith(SINCE);
  });

  it('purges with the requested cutoff', async () => {
    const { client, ...deps } = resources();

    await expect(
      purge.handler({
        ...deps,
        params: { body: { since: SINCE, confirm: 'PURGE' } },
      } as never)
    ).resolves.toEqual({ since: SINCE });
    expect(client.purge).toHaveBeenCalledWith(SINCE);
  });

  it('rejects a cutoff in the future, which would purge nothing', async () => {
    const { client, ...deps } = resources();
    const future = new Date(Date.now() + 60_000).toISOString();

    await expect(
      purge.handler({
        ...deps,
        params: { body: { since: future, confirm: 'PURGE' } },
      } as never)
    ).rejects.toThrow('The purge cutoff must be in the past.');
    expect(client.purge).not.toHaveBeenCalled();
  });

  it('only accepts the typed confirmation', () => {
    expect(purge.params.safeParse({ body: { since: SINCE, confirm: 'please' } }).success).toBe(
      false
    );
    expect(purge.params.safeParse({ body: { since: SINCE, confirm: 'PURGE' } }).success).toBe(true);
  });

  it('rejects a cutoff that is not a timestamp', () => {
    expect(preview.params.safeParse({ query: { since: 'yesterday' } }).success).toBe(false);
  });

  it('requires configure as well as manage, because the delete is irreversible', () => {
    for (const route of [preview, purge]) {
      const { authz } = route.security;
      expect('requiredPrivileges' in authz && authz.requiredPrivileges).toEqual([
        'configure_nightshift',
        'manage_nightshift',
        'agentBuilder:read',
      ]);
    }
  });
});
