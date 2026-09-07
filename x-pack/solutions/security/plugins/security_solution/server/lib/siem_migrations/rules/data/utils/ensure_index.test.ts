/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { IndexAdapter } from '@kbn/index-adapter';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { getIntegrationsFieldMap, getPrebuiltRulesFieldMap } from '../field_maps';
import { ensureIndex } from './ensure_index';

jest.mock('@kbn/index-adapter');

describe.each([
  ['integrations', getIntegrationsFieldMap],
  ['prebuiltrules', getPrebuiltRulesFieldMap],
] as const)('ensureIndex: %s', (adapterId, getFieldMap) => {
  const name = `.kibana-siem-rule-migrations-${adapterId}`;
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const pluginStop$ = new Subject<void>();
  const options = {
    esClient,
    logger,
    pluginStop$,
    kibanaVersion: '9.6.0',
    tasksTimeoutMs: 1234,
    index: name,
    fieldMap: getFieldMap({ elserInferenceId: defaultInferenceEndpoints.ELSER }),
  };
  const mockAdapter = jest.mocked(IndexAdapter);
  const setMapping = (inferenceId: string) => {
    esClient.indices.getMapping.mockResolvedValue({
      [name]: {
        mappings: {
          properties: { elser_embedding: { type: 'semantic_text', inference_id: inferenceId } },
        },
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.inference.get.mockResolvedValue({ endpoints: [] });
    setMapping(defaultInferenceEndpoints.ELSER);
  });

  it('installs the selected field map and verifies the actual index mapping', async () => {
    const inferenceId = 'custom-elser';
    setMapping(inferenceId);
    await ensureIndex({
      ...options,
      fieldMap: getFieldMap({ elserInferenceId: inferenceId }),
    });

    expect(mockAdapter).toHaveBeenCalledWith(name, {
      kibanaVersion: '9.6.0',
      totalFieldsLimit: 2500,
    });
    const [adapter] = mockAdapter.mock.instances;
    expect(adapter.setComponentTemplate).toHaveBeenCalledWith({
      name,
      fieldMap: getFieldMap({ elserInferenceId: inferenceId }),
    });
    expect(adapter.setIndexTemplate).toHaveBeenCalledWith({ name, componentTemplateRefs: [name] });
    expect(adapter.install).toHaveBeenCalledWith({
      esClient,
      logger,
      pluginStop$,
      tasksTimeoutMs: 1234,
    });
    expect(esClient.indices.getMapping).toHaveBeenCalledWith({ index: name });
    expect(esClient.inference.get).not.toHaveBeenCalled();
  });

  it('installs the supplied field map on each call', async () => {
    await ensureIndex(options);
    const inferenceId = defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID;
    setMapping(inferenceId);
    await ensureIndex({ ...options, fieldMap: getFieldMap({ elserInferenceId: inferenceId }) });

    const [first, second] = mockAdapter.mock.instances;
    expect(first).not.toBe(second);
    expect(first.setComponentTemplate).toHaveBeenCalledWith({
      name,
      fieldMap: getFieldMap({ elserInferenceId: defaultInferenceEndpoints.ELSER }),
    });
    expect(second.setComponentTemplate).toHaveBeenCalledWith({
      name,
      fieldMap: getFieldMap({ elserInferenceId: inferenceId }),
    });
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    expect(esClient.indices.delete).not.toHaveBeenCalled();
  });

  it('rejects when installation leaves a different inference endpoint', async () => {
    setMapping('old-endpoint');
    await expect(ensureIndex(options)).rejects.toThrow(
      `Expected inference endpoint ${defaultInferenceEndpoints.ELSER} in the mapping for ${name}`
    );
  });

  it('rejects when the semantic field is missing', async () => {
    esClient.indices.getMapping.mockResolvedValue({ [name]: { mappings: {} } });
    await expect(ensureIndex(options)).rejects.toThrow('Expected inference endpoint');
  });

  it('supports an index without semantic fields', async () => {
    const fieldMap = { title: { type: 'keyword', required: true } } as const;
    await ensureIndex({ ...options, fieldMap });
    expect(mockAdapter.mock.instances[0].setComponentTemplate).toHaveBeenCalledWith({
      name,
      fieldMap,
    });
    expect(esClient.indices.getMapping).not.toHaveBeenCalled();
  });

  it('verifies semantic fields with other names and nested paths', async () => {
    const inferenceId = 'nested-endpoint';
    esClient.indices.getMapping.mockResolvedValue({
      [name]: {
        mappings: {
          properties: {
            content: {
              properties: { embedding: { type: 'semantic_text', inference_id: inferenceId } },
            },
          },
        },
      },
    });
    await expect(
      ensureIndex({
        ...options,
        fieldMap: {
          content: { type: 'object', required: true },
          'content.embedding': { type: 'semantic_text', required: true, inference_id: inferenceId },
        },
      })
    ).resolves.toBeUndefined();
  });

  it('can retry after installation fails', async () => {
    const install = jest.spyOn(IndexAdapter.prototype, 'install');
    install
      .mockRejectedValueOnce(new Error('Installation failed'))
      .mockResolvedValueOnce(undefined);
    await expect(ensureIndex(options)).rejects.toThrow('Installation failed');
    expect(esClient.indices.getMapping).not.toHaveBeenCalled();
    await expect(ensureIndex(options)).resolves.toBeUndefined();
    expect(mockAdapter).toHaveBeenCalledTimes(2);
    install.mockRestore();
  });
});
