/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('timers/promises');
import { errors as EsErrors } from '@elastic/elasticsearch';
import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  COMPOSITE_SLO_RESOURCES_VERSION,
  COMPOSITE_SUMMARY_INDEX_NAME,
  COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
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
import { SLOResourcesNotInstalled } from '../errors';
import { DefaultResourceInstaller } from './resource_installer';
import type { SliRoutingState } from './sli_routing_state';

let mockRoutedVersions: number[] = [3.6];
jest.mock('../../common/constants', () => {
  const actual = jest.requireActual('../../common/constants');
  return {
    ...actual,
    get SLI_ROUTED_VERSIONS() {
      return mockRoutedVersions;
    },
  };
});

const NOW = new Date('2026-11-17T10:00:00.000Z');
const DEC_1 = Date.parse('2026-12-01T00:00:00.000Z');

type EsClientMock = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

const createInstaller = (esClient: EsClientMock) =>
  new DefaultResourceInstaller(esClient, loggerMock.create(), 'M', () => NOW);

const routingPipeline = (
  version: number,
  routing: SliRoutingState,
  templateVersion: number = SLO_RESOURCES_VERSION
): IngestPipeline => ({
  processors: [],
  _meta: { version, template_version: templateVersion, routing, managed: true },
});

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

const mockRoutingPipelines = (
  esClient: EsClientMock,
  pipelines: Record<string, IngestPipeline>
) => {
  esClient.ingest.getPipeline.mockImplementation((params) => {
    const id = params?.id ?? '';
    return Promise.resolve(pipelines[id] ? { [id]: pipelines[id] } : {});
  });
};

describe('resourceInstaller', () => {
  beforeEach(() => {
    mockRoutedVersions = [3.6];
  });

  it('installs the common resources (including composite SLO) when there is a version mismatch', async () => {
    const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
    mockClusterClient.cluster.getComponentTemplate.mockResponse({
      component_templates: [
        {
          name: SLI_INDEX_TEMPLATE_NAME,
          component_template: {
            _meta: {
              version: 2,
            },
            template: {
              settings: {},
            },
          },
        },
      ],
    });
    mockClusterClient.indices.getIndexTemplate.mockResponse({
      index_templates: [
        {
          name: SLI_INDEX_TEMPLATE_NAME,
          index_template: {
            index_patterns: SLI_INDEX_TEMPLATE_NAME,
            composed_of: [SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME],
            _meta: {
              version: 2,
            },
          },
        },
      ],
    });

    mockClusterClient.indices.get.mockResponse({});
    const installer = createInstaller(mockClusterClient);

    await installer.install();

    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(5);
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME })
    );
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: SLI_COMPONENT_TEMPLATE_SETTINGS_NAME })
    );
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ name: SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME })
    );
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ name: SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME })
    );
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ name: COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME })
    );
    expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(4);
    expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: SLI_INDEX_TEMPLATE_NAME })
    );
    expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: SUMMARY_INDEX_TEMPLATE_NAME })
    );
    expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ name: COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME })
    );
    expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ name: HEALTH_INDEX_TEMPLATE_NAME })
    );
    expect(mockClusterClient.indices.create.mock.calls.map(([params]) => params.index)).toEqual([
      SLI_DESTINATION_INDEX_NAME,
      SUMMARY_DESTINATION_INDEX_NAME,
      SUMMARY_TEMP_INDEX_NAME,
      COMPOSITE_SUMMARY_INDEX_NAME,
    ]);
    expect(mockClusterClient.indices.createDataStream).toHaveBeenCalledWith({
      name: HEALTH_DATA_STREAM_NAME,
    });
  });

  it('does not install the common resources when there is a version match', async () => {
    const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
    mockTemplatesUpToDate(mockClusterClient);
    mockClusterClient.indices.get.mockResponse({});
    const installer = createInstaller(mockClusterClient);

    await installer.install();

    expect(mockClusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(mockClusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('stops at the first resource that fails, naming it', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cluster.putComponentTemplate.mockImplementation((params) =>
      params.name === SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ acknowledged: true })
    );

    const result = createInstaller(esClient).install();

    await expect(result).rejects.toThrow(SLOResourcesNotInstalled);
    await expect(result).rejects.toThrow(
      `Failed to install SLO resource [${SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME}]: boom`
    );
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.create).not.toHaveBeenCalled();
    expect(esClient.ingest.putPipeline).not.toHaveBeenCalled();
  });

  it('ignores resources that already exist', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.get.mockResponse({});
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
    esClient.indices.get.mockResponse({});
    esClient.ingest.putPipeline
      .mockRejectedValueOnce(new EsErrors.ConnectionError('connection reset'))
      .mockResolvedValueOnce({ acknowledged: true });

    await expect(createInstaller(esClient).install()).resolves.toBeUndefined();
    expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(2);
  });

  describe('routing pipelines', () => {
    it('installs a routing pipeline for every routed version, guarding the daily history of each independently', async () => {
      mockRoutedVersions = [3.6, 3.7];
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      mockRoutingPipelines(esClient, {});
      esClient.indices.get.mockResponse({
        '.slo-observability.sli-v3.6': {},
        '.slo-observability.sli-v3.6.2026-11-16': {},
        '.slo-observability.sli-v3.7.2026-11-01': {},
      });

      await createInstaller(esClient).install();

      expect(
        esClient.ingest.putPipeline.mock.calls.map(([{ id, _meta: meta }]) => [id, meta?.routing])
      ).toEqual([
        ['.slo-observability.sli.routing-v3.6', { rounding: 'M', cutover: DEC_1 }],
        ['.slo-observability.sli.routing-v3.7', { rounding: 'M', cutover: null }],
      ]);
      // the index listing is shared across versions
      expect(esClient.indices.get).toHaveBeenCalledTimes(1);
    });

    it('does not install the routing pipeline when it is up to date', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      mockRoutingPipelines(esClient, {
        '.slo-observability.sli.routing-v3.6': routingPipeline(3.6, {
          rounding: 'M',
          cutover: DEC_1,
        }),
      });

      await createInstaller(esClient).install();

      expect(esClient.ingest.putPipeline).not.toHaveBeenCalled();
      expect(esClient.indices.get).not.toHaveBeenCalled();
    });

    it('reinstalls the routing pipeline with the same routing when the template version differs', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      const routing: SliRoutingState = { rounding: 'M', cutover: DEC_1 };
      mockRoutingPipelines(esClient, {
        '.slo-observability.sli.routing-v3.6': routingPipeline(3.6, routing, 3.5),
      });

      await createInstaller(esClient).install();

      expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
      expect(esClient.ingest.putPipeline.mock.calls[0][0]._meta).toEqual(
        expect.objectContaining({ template_version: SLO_RESOURCES_VERSION, routing })
      );
    });

    it('keeps the routing state and warns when the configured rounding changed', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      mockRoutingPipelines(esClient, {
        '.slo-observability.sli.routing-v3.6': routingPipeline(3.6, {
          rounding: 'M',
          cutover: null,
        }),
      });
      const logger = loggerMock.create();

      await new DefaultResourceInstaller(esClient, logger, 'd', () => NOW).install();

      expect(esClient.ingest.putPipeline).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('keeps rounding [M], the configured rounding [d]')
      );
    });

    it('stops at the first routing pipeline that fails', async () => {
      mockRoutedVersions = [3.6, 3.7];
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      mockRoutingPipelines(esClient, {});
      esClient.indices.get.mockResponse({});
      esClient.ingest.putPipeline.mockRejectedValue(new Error('boom'));

      await expect(createInstaller(esClient).install()).rejects.toThrow(
        'Failed to install SLO resource [.slo-observability.sli.routing-v3.6]: boom'
      );
      expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
    });
  });
});
