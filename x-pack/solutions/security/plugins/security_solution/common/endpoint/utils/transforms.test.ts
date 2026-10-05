/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { startMetadataTransforms } from './transforms';

const alreadyExistsError = Object.assign(new Error('resource_already_exists_exception'), {
  statusCode: 400,
  body: {
    error: {
      type: 'resource_already_exists_exception',
      reason: 'task with id {endpoint.metadata_current-default-9.6.0} already exist',
    },
  },
});

const createEsClient = (startTransform: jest.Mock): Client =>
  ({
    transform: {
      getTransformStats: jest.fn().mockResolvedValue({
        transforms: [
          { id: 'endpoint.metadata_current-default-9.6.0' },
          { id: 'endpoint.metadata_united-default-9.6.0' },
        ],
      }),
      startTransform,
    },
    search: jest.fn().mockResolvedValue({ hits: { total: 1 } }),
  } as unknown as Client);

describe('startMetadataTransforms', () => {
  it('treats a transform task that already exists as already started', async () => {
    const startTransform = jest.fn().mockRejectedValue(alreadyExistsError);

    await expect(
      startMetadataTransforms(createEsClient(startTransform), ['agent-1'], '9.6.0')
    ).resolves.toBeUndefined();

    expect(startTransform).toHaveBeenCalledWith({
      transform_id: 'endpoint.metadata_current-default-9.6.0',
    });
    expect(startTransform).toHaveBeenCalledWith({
      transform_id: 'endpoint.metadata_united-default-9.6.0',
    });
  });
});
