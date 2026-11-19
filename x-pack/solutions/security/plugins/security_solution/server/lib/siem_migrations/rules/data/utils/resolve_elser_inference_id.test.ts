/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { resolveElserInferenceId } from './resolve_elser_inference_id';

describe('resolveElserInferenceId', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('uses the configured endpoint without discovery', async () => {
    await expect(resolveElserInferenceId(esClient, 'custom-elser')).resolves.toBe('custom-elser');
    expect(esClient.inference.get).not.toHaveBeenCalled();
  });

  it.each([
    [
      [
        defaultInferenceEndpoints.ELSER,
        defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
        defaultInferenceEndpoints.JINAv5,
      ],
      defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
    ],
    [[defaultInferenceEndpoints.ELSER], defaultInferenceEndpoints.ELSER],
    [[defaultInferenceEndpoints.JINAv5], defaultInferenceEndpoints.ELSER],
    [[], defaultInferenceEndpoints.ELSER],
  ])('resolves endpoints %j to %s', async (inferenceIds, expected) => {
    esClient.inference.get.mockResolvedValue({
      endpoints: inferenceIds.map((inferenceId) => ({
        inference_id: inferenceId,
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: {},
        task_settings: {},
      })),
    });

    await expect(resolveElserInferenceId(esClient)).resolves.toBe(expected);
    expect(esClient.inference.get).toHaveBeenCalledWith({});
  });

  it('falls back to local ELSER when discovery fails', async () => {
    esClient.inference.get.mockRejectedValue(new Error('Discovery unavailable'));
    await expect(resolveElserInferenceId(esClient)).resolves.toBe(defaultInferenceEndpoints.ELSER);
  });
});
