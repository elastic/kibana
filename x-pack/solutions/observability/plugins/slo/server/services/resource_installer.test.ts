/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  });

  it('does not install the common resources when there is a version match', async () => {
    const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
    mockClusterClient.cluster.getComponentTemplate.mockImplementation((params) => {
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
    mockClusterClient.indices.getIndexTemplate.mockImplementation((params) => {
      const name = params?.name ?? '';
      const version = name.includes('composite')
        ? COMPOSITE_SLO_RESOURCES_VERSION
        : SLO_RESOURCES_VERSION;
      return Promise.resolve({
        index_templates: [
          {
            name,
            index_template: {
              index_patterns: name,
              composed_of: [],
              _meta: { version },
            },
          },
        ],
      });
    });

    mockClusterClient.indices.get.mockResponse({});
    const installer = createInstaller(mockClusterClient);

    await installer.install();

    expect(mockClusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(mockClusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('does not skip other resources when a component template fails', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.get.mockResponse({});
    esClient.cluster.putComponentTemplate.mockImplementation((params) =>
      params.name === SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ acknowledged: true })
    );

    const installer = createInstaller(esClient);
    const result = installer.install();

    await expect(result).rejects.toThrow(SLOResourcesNotInstalled);
    await expect(result).rejects.toThrow(
      new RegExp(`${SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME}.*${SLI_INDEX_TEMPLATE_NAME}`)
    );

    // the SLI index template and base index depend on the failed component template
    const indexTemplateNames = esClient.indices.putIndexTemplate.mock.calls.map(
      ([params]) => params.name
    );
    expect(indexTemplateNames).toEqual([
      SUMMARY_INDEX_TEMPLATE_NAME,
      COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME,
      HEALTH_INDEX_TEMPLATE_NAME,
    ]);
    const createdIndices = esClient.indices.create.mock.calls.map(([params]) => params.index);
    expect(createdIndices).toEqual([
      SUMMARY_DESTINATION_INDEX_NAME,
      SUMMARY_TEMP_INDEX_NAME,
      COMPOSITE_SUMMARY_INDEX_NAME,
    ]);
    expect(createdIndices).not.toContain(SLI_DESTINATION_INDEX_NAME);
    expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
    expect(esClient.indices.createDataStream).toHaveBeenCalledWith({
      name: HEALTH_DATA_STREAM_NAME,
    });
  });

  it('resolves when every resource is installed', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.get.mockResponse({});

    await expect(createInstaller(esClient).install()).resolves.toBeUndefined();
  });

  describe('routing pipelines', () => {
    it('installs a routing pipeline for every routed version, each with its own prefix', async () => {
      mockRoutedVersions = [3.6, 3.7];
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      mockRoutingPipelines(esClient, {});
      esClient.indices.get.mockResponse({});

      await createInstaller(esClient).install();

      expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(2);
      const [[first], [second]] = esClient.ingest.putPipeline.mock.calls;
      expect(first.id).toBe('.slo-observability.sli.routing-v3.6');
      expect(first.processors?.[1]?.date_index_name?.index_name_prefix).toBe(
        '.slo-observability.sli-v3.6.'
      );
      expect(second.id).toBe('.slo-observability.sli.routing-v3.7');
      expect(second.processors?.[1]?.date_index_name?.index_name_prefix).toBe(
        '.slo-observability.sli-v3.7.'
      );
      // the index listing is shared across versions
      expect(esClient.indices.get).toHaveBeenCalledTimes(1);
    });

    it('guards the daily history of each version independently', async () => {
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

      const [[first], [second]] = esClient.ingest.putPipeline.mock.calls;
      expect(first._meta?.routing).toEqual({ before: 'd', after: 'M', cutover: DEC_1 });
      expect(second._meta?.routing).toEqual({ before: 'M', after: 'M', cutover: null });
    });

    it('does not install the routing pipeline when it is up to date', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      mockRoutingPipelines(esClient, {
        '.slo-observability.sli.routing-v3.6': routingPipeline(3.6, {
          before: 'd',
          after: 'M',
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
      const routing: SliRoutingState = { before: 'd', after: 'M', cutover: DEC_1 };
      mockRoutingPipelines(esClient, {
        '.slo-observability.sli.routing-v3.6': routingPipeline(3.6, routing, 3.5),
      });

      await createInstaller(esClient).install();

      expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
      expect(esClient.ingest.putPipeline.mock.calls[0][0]._meta).toEqual(
        expect.objectContaining({ template_version: SLO_RESOURCES_VERSION, routing })
      );
    });

    it('reinstalls the routing pipeline when the configured rounding changed', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      mockRoutingPipelines(esClient, {
        '.slo-observability.sli.routing-v3.6': routingPipeline(3.6, {
          before: 'M',
          after: 'M',
          cutover: null,
        }),
      });

      await new DefaultResourceInstaller(esClient, loggerMock.create(), 'd', () => NOW).install();

      expect(esClient.ingest.putPipeline.mock.calls[0][0]._meta?.routing).toEqual({
        before: 'M',
        after: 'd',
        cutover: DEC_1,
      });
    });

    it('still installs the other versions when one routing pipeline fails', async () => {
      mockRoutedVersions = [3.6, 3.7];
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      mockRoutingPipelines(esClient, {});
      esClient.indices.get.mockResponse({});
      esClient.ingest.putPipeline.mockImplementation((params) =>
        params.id === '.slo-observability.sli.routing-v3.6'
          ? Promise.reject(new Error('boom'))
          : Promise.resolve({ acknowledged: true })
      );

      await expect(createInstaller(esClient).install()).rejects.toThrow(
        /\.slo-observability\.sli\.routing-v3\.6/
      );
      expect(esClient.ingest.putPipeline).toHaveBeenCalledTimes(2);
    });
  });

  describe('verify', () => {
    const upToDateRouting = routingPipeline(3.6, { before: 'd', after: 'M', cutover: DEC_1 });

    it('returns true when every resource is up to date', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      esClient.indices.exists.mockResponse(true);
      mockRoutingPipelines(esClient, { '.slo-observability.sli.routing-v3.6': upToDateRouting });

      await expect(createInstaller(esClient).verify()).resolves.toBe(true);
      expect(esClient.ingest.putPipeline).not.toHaveBeenCalled();
    });

    it('returns false when the routing pipeline is missing', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      esClient.indices.exists.mockResponse(true);
      mockRoutingPipelines(esClient, {});

      await expect(createInstaller(esClient).verify()).resolves.toBe(false);
    });

    it('returns false when the routing pipeline guard expired', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      esClient.indices.exists.mockResponse(true);
      mockRoutingPipelines(esClient, { '.slo-observability.sli.routing-v3.6': upToDateRouting });

      const installer = new DefaultResourceInstaller(
        esClient,
        loggerMock.create(),
        'M',
        () => new Date('2027-06-01T00:00:00.000Z')
      );

      await expect(installer.verify()).resolves.toBe(false);
    });

    it('returns false when a base index is missing', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      mockTemplatesUpToDate(esClient);
      esClient.indices.exists.mockImplementation((params) =>
        Promise.resolve(params.index !== SLI_DESTINATION_INDEX_NAME)
      );
      mockRoutingPipelines(esClient, { '.slo-observability.sli.routing-v3.6': upToDateRouting });

      await expect(createInstaller(esClient).verify()).resolves.toBe(false);
    });

    it('returns false on Elasticsearch errors', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.cluster.getComponentTemplate.mockRejectedValue(new Error('boom'));

      await expect(createInstaller(esClient).verify()).resolves.toBe(false);
    });
  });
});
