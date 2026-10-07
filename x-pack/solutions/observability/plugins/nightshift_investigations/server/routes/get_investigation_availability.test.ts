/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInvestigationAvailabilityRoute } from './get_investigation_availability';

const { handler } =
  getInvestigationAvailabilityRoute['GET /internal/nightshift/investigations/availability'];

it('returns the centralized investigation availability result', async () => {
  const isAvailable = jest.fn().mockResolvedValue(true);
  const request = {};

  await expect(
    handler({
      request,
      params: {},
      getInvestigationsClient: () => ({ isAvailable }),
    } as never)
  ).resolves.toEqual({ available: true });
  expect(isAvailable).toHaveBeenCalledWith(undefined);
});

it('honors connector_id and reports an unknown model as unavailable', async () => {
  const isAvailable = jest.fn().mockResolvedValue(false);

  await expect(
    handler({
      request: {},
      params: { query: { connector_id: 'missing-model' } },
      getInvestigationsClient: () => ({ isAvailable }),
    } as never)
  ).resolves.toEqual({ available: false });
  expect(isAvailable).toHaveBeenCalledWith('missing-model');
});
