/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { loggerMock } from '@kbn/logging-mocks';
import { docLinksServiceMock } from '@kbn/core/server/mocks';
import { MONITORING_ENTITY_SOURCE_URL } from '../../../../../../common/constants';
import { createMockConfig } from '../../../../../config.mock';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../../detection_engine/routes/__mocks__';

const mockValidateIndexPermissions = jest.fn();

jest.mock('../../../watchlists/entity_sources/entity_source_api_key', () => ({
  validateIndexPermissions: (...args: unknown[]) => mockValidateIndexPermissions(...args),
}));

const mockScheduleNow = jest.fn();
const mockGetEngineStatus = jest.fn();

jest.mock('../../engine/status_service', () => ({
  createEngineStatusService: () => ({
    get: mockGetEngineStatus,
    scheduleNow: mockScheduleNow,
  }),
}));

// Import after mocks are set up
import { updateMonitoringEntitySourceRoute } from './update';

describe('PUT /api/entity_analytics/monitoring/entity_source/{id} - updateMonitoringEntitySourceRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let ctx: ReturnType<typeof requestContextMock.createTools>['context'];
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  const mockUpdate = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    ({ context: ctx } = requestContextMock.createTools());

    mockValidateIndexPermissions.mockReset().mockResolvedValue(undefined);
    mockUpdate.mockReset().mockImplementation(async (source) => ({ ...source }));
    mockGet.mockReset().mockResolvedValue({ id: 'es-1', indexPattern: 'logs-*' });
    mockScheduleNow.mockReset();
    // Engine not running: happy path skips the scheduler.
    mockGetEngineStatus.mockReset().mockResolvedValue({ status: 'stopped' });

    (ctx.securitySolution.getMonitoringEntitySourceDataClient as jest.Mock).mockReturnValue({
      update: mockUpdate,
      get: mockGet,
    });
    (ctx.securitySolution.getPrivilegeMonitoringDataClient as jest.Mock).mockReturnValue({
      getScopedSoClient: jest.fn(),
    });

    context = requestContextMock.convertContext(ctx);

    updateMonitoringEntitySourceRoute(
      server.router,
      logger,
      createMockConfig(),
      docLinksServiceMock.createSetupContract()
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (body: object) =>
    requestMock.create({
      method: 'put',
      path: `${MONITORING_ENTITY_SOURCE_URL}/{id}`,
      params: { id: 'es-1' },
      body,
    });

  it('returns 403 and does not update the source when the caller lacks privileges on the new indexPattern', async () => {
    mockValidateIndexPermissions.mockRejectedValue(Boom.forbidden('Insufficient index privileges'));

    const request = buildRequest({ indexPattern: 'logs-*' });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(403);
    expect(mockValidateIndexPermissions).toHaveBeenCalledWith(expect.anything(), 'logs-*');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 403 and does not update when caller lacks privileges on the existing indexPattern', async () => {
    mockValidateIndexPermissions.mockRejectedValue(Boom.forbidden('Insufficient index privileges'));

    const request = buildRequest({ name: 'renamed-source' });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(403);
    expect(mockGet).toHaveBeenCalledWith('es-1');
    expect(mockValidateIndexPermissions).toHaveBeenCalledWith(expect.anything(), 'logs-*');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates the source when the caller has index privileges', async () => {
    const request = buildRequest({ indexPattern: 'logs-*' });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(mockValidateIndexPermissions).toHaveBeenCalledWith(expect.anything(), 'logs-*');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'es-1', indexPattern: 'logs-*' })
    );
  });

  it('validates the existing indexPattern even when the update body omits it', async () => {
    const request = buildRequest({ name: 'renamed-source' });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(mockGet).toHaveBeenCalledWith('es-1');
    expect(mockValidateIndexPermissions).toHaveBeenCalledWith(expect.anything(), 'logs-*');
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('skips validation when neither the update body nor the existing source has an indexPattern', async () => {
    mockGet.mockResolvedValue({ id: 'es-1' });

    const request = buildRequest({ name: 'renamed-source' });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(mockValidateIndexPermissions).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });
});
