/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { requestMock, serverMock } from '../../../detection_engine/routes/__mocks__';
import { ENTITY_RESOLUTION_CSV_UPLOAD_URL } from '../../../../../common/entity_analytics/entity_store/constants';
import type { HapiReadableStream } from '../../../../types';
import { entityResolutionCsvUploadRoute } from './upload_csv';

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
