/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, SavedObjectsFindResponse } from '@kbn/core/server';
import { INTERNAL_TAGS_URL, SECURITY_TAG_NAME } from '../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { mockGetTagsResult } from '../__mocks__';
import { getTagsByNameRoute } from './get_tags_by_name';

describe('getTagsByNameRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  const { context } = requestContextMock.createTools();
  const logger = { error: jest.fn() } as unknown as Logger;

  const mockGetRequest = requestMock.create({
    method: 'get',
    path: INTERNAL_TAGS_URL,
    query: { name: SECURITY_TAG_NAME },
  });

  const savedObjectFindResponse = {
    saved_objects: mockGetTagsResult,
  } as unknown as SavedObjectsFindResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();

    getTagsByNameRoute(server.router, logger);
  });

  it('should return tags with the exact name', async () => {
    context.core.savedObjects.client.find.mockResolvedValueOnce(savedObjectFindResponse);
    const response = await server.inject(
      mockGetRequest,
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toMatchInlineSnapshot(`
      Array [
        Object {
          "attributes": Object {
            "color": "#4bc922",
            "description": "Security Solution auto-generated tag",
            "name": "Security Solution",
          },
          "coreMigrationVersion": "8.8.0",
          "created_at": "2023-03-27T17:57:41.647Z",
          "id": "de7ad1f0-ccc8-11ed-9175-1b0d4269ff48",
          "namespaces": Array [
            "default",
          ],
          "references": Array [],
          "score": null,
          "sort": Array [
            1679939861647,
          ],
          "type": "tag",
          "typeMigrationVersion": "8.0.0",
          "updated_at": "2023-03-27T17:57:41.647Z",
          "version": "WzE2Njc1LDFd",
        },
      ]
    `);
  });

  it('should return error', async () => {
    const message = 'Internal Server Error';
    context.core.savedObjects.client.find.mockRejectedValueOnce(new Error(message));
    const response = await server.inject(
      mockGetRequest,
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(500);
    expect(response.body.message).toEqual(`Failed to find ${SECURITY_TAG_NAME} tags - ${message}`);
  });
});
