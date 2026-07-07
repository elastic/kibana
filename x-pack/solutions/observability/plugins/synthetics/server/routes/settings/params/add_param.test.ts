/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObject, SavedObjectError } from '@kbn/core-saved-objects-api-server';
import type { RouteContext } from '../../types';
import { addSyntheticsParamsRoute } from './add_param';

jest.mock('../../../tasks/sync_global_params_task', () => ({
  asyncGlobalParamsPropagation: jest.fn().mockResolvedValue(undefined),
}));

const buildServer = () =>
  ({
    spaces: {
      spacesService: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
        getSpaceId: jest.fn().mockReturnValue('default'),
      },
    },
  } as unknown as RouteContext['server']);

const buildRouteContext = (overrides: Partial<RouteContext> = {}): RouteContext =>
  ({
    savedObjectsClient: savedObjectsClientMock.create(),
    server: buildServer(),
    response: { notFound: jest.fn() } as unknown as RouteContext['response'],
    ...overrides,
  } as unknown as RouteContext);

const paramSavedObject = (id: string, key: string): SavedObject<Record<string, unknown>> =>
  ({
    id,
    type: 'synthetics-param',
    references: [],
    namespaces: ['default'],
    attributes: { key, value: `${key}-value`, description: '', tags: [] },
  } as unknown as SavedObject<Record<string, unknown>>);

const errorEntry = (id: string, error: SavedObjectError) => ({ id, type: 'synthetics-param', error });

describe('addSyntheticsParamsRoute', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws the underlying error when a multi-param bulkCreate partially fails', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [
        paramSavedObject('1', 'a'),
        errorEntry('2', {
          error: 'Conflict',
          message: 'version conflict',
          statusCode: 409,
        }),
      ],
    } as Awaited<ReturnType<typeof savedObjectsClient.bulkCreate>>);

    const route = addSyntheticsParamsRoute();

    await expect(
      route.handler(
        buildRouteContext({
          savedObjectsClient,
          request: {
            body: [
              { key: 'a', value: 'a-value' },
              { key: 'b', value: 'b-value' },
            ],
          } as unknown as RouteContext['request'],
        })
      )
    ).rejects.toThrow('version conflict');
  });

  it('returns every param when a multi-param bulkCreate fully succeeds', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [paramSavedObject('1', 'a'), paramSavedObject('2', 'b')],
    } as Awaited<ReturnType<typeof savedObjectsClient.bulkCreate>>);

    const route = addSyntheticsParamsRoute();

    const result = await route.handler(
      buildRouteContext({
        savedObjectsClient,
        request: {
          body: [
            { key: 'a', value: 'a-value' },
            { key: 'b', value: 'b-value' },
          ],
        } as unknown as RouteContext['request'],
      })
    );

    expect(result).toEqual([
      expect.objectContaining({ id: '1', key: 'a' }),
      expect.objectContaining({ id: '2', key: 'b' }),
    ]);
  });

  it('throws the underlying error when a single-param bulkCreate fails', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [
        errorEntry('1', {
          error: 'Bad Request',
          message: 'invalid param',
          statusCode: 400,
        }),
      ],
    } as Awaited<ReturnType<typeof savedObjectsClient.bulkCreate>>);

    const route = addSyntheticsParamsRoute();

    await expect(
      route.handler(
        buildRouteContext({
          savedObjectsClient,
          request: {
            body: { key: 'a', value: 'a-value' },
          } as unknown as RouteContext['request'],
        })
      )
    ).rejects.toThrow('invalid param');
  });
});
