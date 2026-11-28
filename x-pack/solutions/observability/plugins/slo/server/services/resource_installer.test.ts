/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('timers/promises');
import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  COMPOSITE_SLO_RESOURCES_VERSION,
  COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  COMPOSITE_SUMMARY_INDEX_NAME,
  COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME,
  HEALTH_DATA_STREAM_NAME,
  HEALTH_INDEX_TEMPLATE_NAME,
  SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLI_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLI_DESTINATION_INDEX_NAME,
  SLI_INDEX_TEMPLATE_NAME,
  SLO_RESOURCES_VERSION,
  SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SUMMARY_DESTINATION_INDEX_NAME,
  SUMMARY_INDEX_TEMPLATE_NAME,
  SUMMARY_TEMP_INDEX_NAME,
} from '../../common/constants';
import { DefaultResourceInstaller } from './resource_installer';

type EsClientMock = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

const createInstaller = (esClient: EsClientMock) =>
  new DefaultResourceInstaller(esClient, loggerMock.create());

const mockTemplatesUpToDate = (esClient: EsClientMock) => {
  esClient.cluster.getComponentTemplate.mockImplementation((params) => {
    const name = params?.name ?? '';
    const version = name.includes('composite')
      ? COMPOSITE_SLO_RESOURCES_VERSION
      : SLO_RESOURCES_VERSION;
    return Promise.resolve({
      component_templates: [
        { name, component_template: { _meta: { version }, template: { settings: {} } } },
      ],
    });
  });
  esClient.indices.getIndexTemplate.mockImplementation((params) => {
    const name = params?.name ?? '';
    const version = name.includes('composite')
      ? COMPOSITE_SLO_RESOURCES_VERSION
      : SLO_RESOURCES_VERSION;
    return Promise.resolve({
      index_templates: [
        { name, index_template: { index_patterns: name, composed_of: [], _meta: { version } } },
      ],
    });
  });
};

describe('resourceInstaller', () => {
  it('installs the common resources (including composite SLO) when there is a version mismatch', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cluster.getComponentTemplate.mockResponse({
      component_templates: [
        {
          name: SLI_INDEX_TEMPLATE_NAME,
          component_template: { _meta: { version: 2 }, template: { settings: {} } },
        },
      ],
    });
    esClient.indices.getIndexTemplate.mockResponse({
      index_templates: [
        {
          name: SLI_INDEX_TEMPLATE_NAME,
          index_template: {
            index_patterns: SLI_INDEX_TEMPLATE_NAME,
            composed_of: [SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME],
            _meta: { version: 2 },
          },
        },
      ],
    });

    await createInstaller(esClient).install();

    expect(esClient.cluster.putComponentTemplate.mock.calls.map(([params]) => params.name)).toEqual(
      [
        SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME,
        SLI_COMPONENT_TEMPLATE_SETTINGS_NAME,
        SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
        SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
        COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
      ]
    );
    expect(esClient.indices.putIndexTemplate.mock.calls.map(([params]) => params.name)).toEqual([
      SLI_INDEX_TEMPLATE_NAME,
      SUMMARY_INDEX_TEMPLATE_NAME,
      COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME,
      HEALTH_INDEX_TEMPLATE_NAME,
    ]);
    expect(esClient.indices.create.mock.calls.map(([params]) => params.index)).toEqual([
      SLI_DESTINATION_INDEX_NAME,
      SUMMARY_DESTINATION_INDEX_NAME,
      SUMMARY_TEMP_INDEX_NAME,
      COMPOSITE_SUMMARY_INDEX_NAME,
    ]);
    expect(esClient.indices.putMapping).toHaveBeenCalledWith(
      expect.objectContaining({ index: COMPOSITE_SUMMARY_INDEX_NAME }),
      { signal: undefined }
    );
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith(
      { name: HEALTH_DATA_STREAM_NAME },
      { signal: undefined }
    );
  });

  it('does not install the common resources when there is a version match', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    mockTemplatesUpToDate(esClient);

    await createInstaller(esClient).install();

    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('stops at the first resource that fails, naming it', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cluster.putComponentTemplate.mockImplementation((params) =>
      params.name === SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ acknowledged: true })
    );

    const result = createInstaller(esClient).install();

    await expect(result).rejects.toThrow(
      `Failed to install SLO resource [${SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME}]: boom`
    );
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.create).not.toHaveBeenCalled();
  });

  it('names the health data stream when it cannot be created', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.createDataStream.mockRejectedValue(new Error('blocked'));

    await expect(createInstaller(esClient).install()).rejects.toThrow(
      `Failed to install SLO resource [${HEALTH_DATA_STREAM_NAME}]: blocked`
    );
  });

  it('ignores resources that already exist', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const alreadyExists = new EsErrors.ResponseError(
      elasticsearchServiceMock.createApiResponse({
        statusCode: 400,
        body: { error: { type: 'resource_already_exists_exception' } },
      })
    );
    esClient.indices.create.mockRejectedValue(alreadyExists);
    esClient.indices.createDataStream.mockRejectedValue(alreadyExists);

    await expect(createInstaller(esClient).install()).resolves.toBeUndefined();
  });

  it('retries transient Elasticsearch errors', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.createDataStream
      .mockRejectedValueOnce(new EsErrors.ConnectionError('connection reset'))
      .mockResolvedValueOnce({ acknowledged: true });

    await expect(createInstaller(esClient).install()).resolves.toBeUndefined();
    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(2);
  });

  it('passes the abort signal to every Elasticsearch call', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const { signal } = new AbortController();

    await createInstaller(esClient).install(signal);

    const calls: unknown[][] = [
      ...esClient.cluster.getComponentTemplate.mock.calls,
      ...esClient.cluster.putComponentTemplate.mock.calls,
      ...esClient.indices.getIndexTemplate.mock.calls,
      ...esClient.indices.putIndexTemplate.mock.calls,
      ...esClient.indices.create.mock.calls,
      ...esClient.indices.putMapping.mock.calls,
      ...esClient.indices.createDataStream.mock.calls,
    ];
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((call) => {
      expect(call[call.length - 1]).toEqual(expect.objectContaining({ signal }));
    });
  });

  it('names the template that failed when an earlier request was aborted', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cluster.putComponentTemplate.mockImplementation(({ name }) =>
      name === SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME
        ? Promise.reject(new EsErrors.RequestAbortedError('Request aborted'))
        : name === SLI_COMPONENT_TEMPLATE_SETTINGS_NAME
          ? Promise.reject(new Error('boom'))
          : Promise.resolve({ acknowledged: true })
    );

    await expect(createInstaller(esClient).install()).rejects.toThrow(
      `Failed to install SLO resource [${SLI_COMPONENT_TEMPLATE_SETTINGS_NAME}]: boom`
    );
  });
});
