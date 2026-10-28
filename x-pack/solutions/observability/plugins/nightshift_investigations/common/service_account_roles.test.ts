/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureNightshiftServiceAccountRoles } from './service_account_roles';

describe('ensureNightshiftServiceAccountRoles', () => {
  const createClient = () => ({ security: { putRole: jest.fn().mockResolvedValue({}) } });

  it('creates both roles, named like the accounts, on stateful', async () => {
    const esClient = createClient();

    await ensureNightshiftServiceAccountRoles(esClient, { isServerless: false });

    expect(esClient.security.putRole.mock.calls.map(([{ name }]) => name).sort()).toEqual([
      'nightshift_agent',
      'nightshift_automations',
    ]);
  });

  it('leaves Serverless, which has its own predefined roles, alone', async () => {
    const esClient = createClient();

    await ensureNightshiftServiceAccountRoles(esClient, { isServerless: true });

    expect(esClient.security.putRole).not.toHaveBeenCalled();
  });
});
