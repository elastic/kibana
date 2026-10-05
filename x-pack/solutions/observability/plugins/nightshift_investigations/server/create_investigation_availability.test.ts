/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { of } from 'rxjs';
import { createInvestigationAvailability } from './create_investigation_availability';

it('keeps the agent available when infrastructure exists without probing a model', async () => {
  const request = {} as KibanaRequest;
  const getClient = jest.fn();
  const availability = createInvestigationAvailability({
    getDeps: () => ({
      featureFlags: {
        getBooleanValue$: jest.fn().mockReturnValue(of(true)),
      } as never,
      agentBuilder: {} as never,
      inference: { getClient } as never,
      logger: { warn: jest.fn() } as never,
      workflowsExtensions: {} as never,
      workflowsManagement: {
        management: {
          getClient: () => ({
            getWorkflow: jest.fn().mockResolvedValue({ definition: {} }),
          }),
        },
      } as never,
    }),
  });

  await expect(availability.handler({ request, spaceId: 'default' } as never)).resolves.toEqual({
    status: 'available',
  });
  expect(getClient).not.toHaveBeenCalled();
});
