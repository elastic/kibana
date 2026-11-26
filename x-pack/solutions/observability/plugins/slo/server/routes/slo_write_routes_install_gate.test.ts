/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOResourcesNotInstalled } from '../errors';
import { createSLORoute } from './create_slo';
import { resetSLORoute } from './reset_slo';
import { updateSLORoute } from './update_slo';

const WRITE_ROUTES = [
  ['create', createSLORoute],
  ['update', updateSLORoute],
  ['reset', resetSLORoute],
] as const;

describe.each(WRITE_ROUTES)('%s SLO route install gate', (_name, routes) => {
  it('responds 503 before any SLO mutation when the resources are not installed', async () => {
    const [route] = Object.values(routes);
    const getScopedClients = jest.fn();
    const ensureInstalled = jest.fn().mockRejectedValue(new SLOResourcesNotInstalled('not ready'));
    const resources = {
      request: {},
      logger: { debug: jest.fn() },
      plugins: {
        licensing: {
          start: async () => ({ getLicense: async () => ({ hasAtLeast: () => true }) }),
        },
      },
      resourceInstallState: { ensureInstalled },
      getScopedClients,
    };

    await expect(
      route.handler(resources as unknown as Parameters<typeof route.handler>[0])
    ).rejects.toMatchObject({ output: { statusCode: 503 }, message: 'not ready' });

    expect(ensureInstalled).toHaveBeenCalledTimes(1);
    expect(getScopedClients).not.toHaveBeenCalled();
  });
});
