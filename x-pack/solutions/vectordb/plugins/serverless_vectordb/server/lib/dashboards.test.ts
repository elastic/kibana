/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { countExistingDashboards, fetchDashboardsCount } from './dashboards';

describe('fetchDashboardsCount', () => {
  const logger = loggingSystemMock.createLogger();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the total from the saved objects client', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockResolvedValue({ total: 7, page: 1, per_page: 0, saved_objects: [] });

    await expect(fetchDashboardsCount(soClient, logger)).resolves.toBe(7);
    expect(soClient.find).toHaveBeenCalledWith({ type: 'dashboard', perPage: 0 });
  });

  it('returns null (not 0) and logs when the lookup fails', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.find.mockRejectedValue(new Error('nope'));

    await expect(fetchDashboardsCount(soClient, logger)).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe('countExistingDashboards', () => {
  const logger = loggingSystemMock.createLogger();

  const notFound = { error: 'Not Found', message: 'Not found', statusCode: 404 };

  const dashboard = (id: string, missing = false) => ({
    id,
    type: 'dashboard',
    attributes: {},
    references: [],
    ...(missing ? { error: notFound } : {}),
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips the lookup when nothing is starred', async () => {
    const soClient = savedObjectsClientMock.create();

    await expect(countExistingDashboards(soClient, [], logger)).resolves.toBe(0);
    expect(soClient.bulkGet).not.toHaveBeenCalled();
  });

  it('ignores starred dashboards that have since been deleted', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.bulkGet.mockResolvedValue({
      saved_objects: [dashboard('kept'), dashboard('deleted', true)],
    });

    await expect(countExistingDashboards(soClient, ['kept', 'deleted'], logger)).resolves.toBe(1);
    expect(soClient.bulkGet).toHaveBeenCalledWith([
      { type: 'dashboard', id: 'kept', fields: ['title'] },
      { type: 'dashboard', id: 'deleted', fields: ['title'] },
    ]);
  });

  it('returns null (not 0) and logs when the lookup fails', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.bulkGet.mockRejectedValue(new Error('nope'));

    await expect(countExistingDashboards(soClient, ['starred'], logger)).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });
});
