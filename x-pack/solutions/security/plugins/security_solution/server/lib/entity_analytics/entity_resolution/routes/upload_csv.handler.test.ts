/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { requestMock, serverMock } from '../../../detection_engine/routes/__mocks__';
import { ENTITY_RESOLUTION_CSV_UPLOAD_URL } from '../../../../../common/entity_analytics/entity_store/constants';
import { ENTITY_STORE_RESOLUTION_CSV_UPLOAD_EVENT } from '../../../telemetry/event_based/events';
import type { HapiReadableStream } from '../../../../types';
import { entityResolutionCsvUploadRoute } from './upload_csv';
import { processResolutionCsvUpload } from '../csv_upload';

jest.mock('../csv_upload', () => ({
  processResolutionCsvUpload: jest.fn(),
}));

const createMockStream = (): HapiReadableStream => {
  const stream = new Readable() as HapiReadableStream;
  stream.push('');
  stream.push(null);
  stream.hapi = { filename: 'resolution.csv' } as HapiReadableStream['hapi'];
  return stream;
};

const getPostHandler = (router: ReturnType<typeof serverMock.create>['router']) => {
  const config = router.versioned.post.mock.calls[0][0];
  const route = router.versioned.getRoute('post', config.path);
  const firstVersion = Object.values(route.versions)[0] as {
    handler: (typeof route.versions)[string]['handler'];
  };
  return firstVersion.handler;
};

const mockAnalytics = (): AnalyticsServiceStart =>
  ({ reportEvent: jest.fn() } as unknown as AnalyticsServiceStart);

describe('entityResolutionCsvUploadRoute — license gating', () => {
  const logger = loggingSystemMock.create().get();

  it('returns 403 when license is not enterprise', async () => {
    const server = serverMock.create();
    entityResolutionCsvUploadRoute({
      router: server.router,
      logger,
      getStartServices: jest.fn(),
    } as never);

    const handler = getPostHandler(server.router);
    const responseFactory = httpServerMock.createResponseFactory();
    const hasAtLeast = jest.fn().mockReturnValue(false);
    const context = {
      licensing: Promise.resolve({
        license: { hasAtLeast },
      }),
    };

    const request = requestMock.create({
      method: 'post',
      path: ENTITY_RESOLUTION_CSV_UPLOAD_URL,
      body: {
        file: createMockStream(),
      },
    });

    const result = await handler(context, request, responseFactory);

    expect(hasAtLeast).toHaveBeenCalledWith('enterprise');
    expect(responseFactory.forbidden).toHaveBeenCalledWith({
      body: {
        message: 'Entity Resolution requires an Enterprise license',
      },
    });
    expect(result).toEqual(responseFactory.forbidden.mock.results[0]?.value);
  });
});

describe('entityResolutionCsvUploadRoute — telemetry', () => {
  const logger = loggingSystemMock.create().get();
  const namespace = 'default';
  let analytics: AnalyticsServiceStart;
  let getStartServices: jest.Mock;
  let handler: ReturnType<typeof getPostHandler>;
  let responseFactory: ReturnType<typeof httpServerMock.createResponseFactory>;

  const createLicensedContext = () => ({
    licensing: Promise.resolve({
      license: { hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
    core: Promise.resolve({
      elasticsearch: {
        client: {
          asCurrentUser: {},
        },
      },
    }),
    securitySolution: Promise.resolve({
      getSpaceId: () => namespace,
    }),
  });

  const createRequest = () =>
    requestMock.create({
      method: 'post',
      path: ENTITY_RESOLUTION_CSV_UPLOAD_URL,
      body: {
        file: createMockStream(),
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();

    analytics = mockAnalytics();
    getStartServices = jest.fn().mockResolvedValue([
      { analytics },
      {
        entityStore: {
          createCRUDClient: jest.fn().mockReturnValue({}),
          createResolutionClient: jest.fn().mockReturnValue({}),
        },
      },
    ]);

    const server = serverMock.create();
    entityResolutionCsvUploadRoute({
      router: server.router,
      logger,
      getStartServices,
    } as never);

    handler = getPostHandler(server.router);
    responseFactory = httpServerMock.createResponseFactory();
  });

  it('reports telemetry on successful upload without errors in payload', async () => {
    (processResolutionCsvUpload as jest.Mock).mockResolvedValue({
      total: 2,
      successful: 1,
      failed: 0,
      unmatched: 1,
      items: [],
      errorCounts: {},
    });

    await handler(createLicensedContext(), createRequest(), responseFactory);

    expect(processResolutionCsvUpload).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);

    const [eventType, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(eventType).toBe(ENTITY_STORE_RESOLUTION_CSV_UPLOAD_EVENT.eventType);
    expect(payload).toMatchObject({
      total: 2,
      successful: 1,
      failed: 0,
      unmatched: 1,
      namespace,
    });
    expect(payload.durationMs).toEqual(expect.any(Number));
    expect(payload.errors).toBeUndefined();

    expect(responseFactory.ok).toHaveBeenCalledWith({
      body: {
        total: 2,
        successful: 1,
        failed: 0,
        unmatched: 1,
        items: [],
      },
    });
    expect(responseFactory.ok.mock.calls[0]?.[0]?.body).not.toHaveProperty('errorCounts');
  });

  it('includes errors array in telemetry when errorCounts is populated', async () => {
    (processResolutionCsvUpload as jest.Mock).mockResolvedValue({
      total: 2,
      successful: 0,
      failed: 2,
      unmatched: 0,
      items: [],
      errorCounts: {
        invalid_entity_type: 1,
        target_not_found: 1,
      },
    });

    await handler(createLicensedContext(), createRequest(), responseFactory);

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.errors).toHaveLength(2);
    expect(
      [...payload.errors].sort((a, b) => a.errorCategory.localeCompare(b.errorCategory))
    ).toEqual([
      { errorCategory: 'invalid_entity_type', count: 1 },
      { errorCategory: 'target_not_found', count: 1 },
    ]);
    expect(payload).toMatchObject({
      total: 2,
      failed: 2,
      namespace,
    });
  });

  it('does not report telemetry on catastrophic failure', async () => {
    (processResolutionCsvUpload as jest.Mock).mockRejectedValue(
      new Error('CSV parse aborted before processing rows')
    );

    await handler(createLicensedContext(), createRequest(), responseFactory);

    expect(analytics.reportEvent).not.toHaveBeenCalled();
    expect(responseFactory.ok).not.toHaveBeenCalled();
    expect(responseFactory.custom).toHaveBeenCalled();
  });

  it('returns 200 when reportEvent throws after a completed upload', async () => {
    (processResolutionCsvUpload as jest.Mock).mockResolvedValue({
      total: 1,
      successful: 1,
      failed: 0,
      unmatched: 0,
      items: [],
      errorCounts: {},
    });
    (analytics.reportEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Unregistered event type');
    });

    await handler(createLicensedContext(), createRequest(), responseFactory);

    expect(responseFactory.ok).toHaveBeenCalledWith({
      body: {
        total: 1,
        successful: 1,
        failed: 0,
        unmatched: 0,
        items: [],
      },
    });
    expect(responseFactory.custom).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to report entity resolution CSV upload telemetry: Unregistered event type'
    );
  });
});
