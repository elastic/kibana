/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import type { SignificantEventsServer } from '../../types';
import { createSignificantEventsAvailability } from './significant_events_availability';

jest.mock('../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const { assertSignificantEventsAccess } = jest.requireMock(
  '../../routes/utils/assert_significant_events_access'
);

const evaluate = (spaceId: string) => {
  const availability = createSignificantEventsAvailability({
    server: { licensing: {} } as unknown as SignificantEventsServer,
    logger: loggingSystemMock.createLogger(),
  });

  return availability.handler!({
    request: httpServerMock.createKibanaRequest(),
    uiSettings: uiSettingsServiceMock.createClient(),
    spaceId,
  });
};

describe('createSignificantEventsAvailability', () => {
  beforeEach(() => {
    assertSignificantEventsAccess.mockClear();
  });

  it('is available in the default space', async () => {
    expect(await evaluate('default')).toEqual({ status: 'available' });
  });

  it('is unavailable outside the default space, without checking access', async () => {
    expect(await evaluate('marketing')).toEqual({
      status: 'unavailable',
      reason: expect.stringContaining('default'),
    });
    expect(assertSignificantEventsAccess).not.toHaveBeenCalled();
  });
});
