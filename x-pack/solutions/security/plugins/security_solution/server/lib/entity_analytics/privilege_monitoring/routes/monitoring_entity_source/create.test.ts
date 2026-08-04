/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { loggerMock } from '@kbn/logging-mocks';
import { MONITORING_ENTITY_SOURCE_URL } from '../../../../../../common/constants';
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
import { createMonitoringEntitySourceRoute } from './create';

describe('POST /api/entity_analytics/monitoring/entity_source - createMonitoringEntitySourceRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let ctx: ReturnType<typeof requestContextMock.createTools>['context'];
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let logger: ReturnType<typeof loggerMock.create>;

  const mockCreate = jest.fn();

  beforeEach(() => {
    server = serverMock.create();
    logger = loggerMock.create();
    ({ context: ctx } = requestContextMock.createTools());

    mockValidateIndexPermissions.mockReset().mockResolvedValue(undefined);
    mockCreate.mockReset().mockImplementation(async (source) => ({ id: 'es-1', ...source }));
    mockScheduleNow.mockReset();
    // Engine not running: happy path skips the scheduler.
    mockGetEngineStatus.mockReset().mockResolvedValue({ status: 'stopped' });

    (ctx.securitySolution.getMonitoringEntitySourceDataClient as jest.Mock).mockReturnValue({
      create: mockCreate,
    });
    (ctx.securitySolution.getPrivilegeMonitoringDataClient as jest.Mock).mockReturnValue({
      getScopedSoClient: jest.fn(),
    });

    context = requestContextMock.convertContext(ctx);

    createMonitoringEntitySourceRoute(server.router, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildRequest = (body: object) =>
    requestMock.create({
      method: 'post',
      path: MONITORING_ENTITY_SOURCE_URL,
      body,
    });

  it('returns 403 and does not create the source when the caller lacks index privileges', async () => {
    mockValidateIndexPermissions.mockRejectedValue(Boom.forbidden('Insufficient index privileges'));

    const request = buildRequest({ type: 'index', name: 'my-source', indexPattern: 'logs-*' });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(403);
    expect(mockValidateIndexPermissions).toHaveBeenCalledWith(expect.anything(), 'logs-*');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates the source when the caller has index privileges', async () => {
    const request = buildRequest({ type: 'index', name: 'my-source', indexPattern: 'logs-*' });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(mockValidateIndexPermissions).toHaveBeenCalledWith(expect.anything(), 'logs-*');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'index', name: 'my-source', indexPattern: 'logs-*' })
    );
  });

  it('does not validate index permissions when no indexPattern is provided', async () => {
    const request = buildRequest({ type: 'index', name: 'my-source' });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(200);
    expect(mockValidateIndexPermissions).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
  });

  it('rejects non-index source types before validating or creating', async () => {
    const request = buildRequest({
      type: 'entity_analytics_integration',
      name: 'my-source',
      indexPattern: 'logs-*',
    });
    const response = await server.inject(request, context);

    expect(response.status).toEqual(400);
    expect(mockValidateIndexPermissions).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
