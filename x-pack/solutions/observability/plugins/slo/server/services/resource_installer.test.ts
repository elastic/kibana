/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  COMPOSITE_SLO_RESOURCES_VERSION,
  COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME,
  HEALTH_INDEX_TEMPLATE_NAME,
  SLI_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLI_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLI_INDEX_TEMPLATE_NAME,
  SLO_RESOURCES_VERSION,
  SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SUMMARY_INDEX_TEMPLATE_NAME,
} from '../../common/constants';
import { DefaultResourceInstaller } from './resource_installer';

describe('resourceInstaller', () => {
  it('installs the common resources (including composite SLO) when there is a version mismatch and composite SLO is enabled', async () => {
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

    const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create(), true);

    await installer.ensureCommonResourcesInstalled();

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

    const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create(), true);

    await installer.ensureCommonResourcesInstalled();

    expect(mockClusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(mockClusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('skips composite SLO resources when composite SLO is disabled', async () => {
    const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
    mockClusterClient.cluster.getComponentTemplate.mockResponse({
      component_templates: [
        {
          name: SLI_INDEX_TEMPLATE_NAME,
          component_template: {
            _meta: { version: 2 },
            template: { settings: {} },
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
            composed_of: [],
            _meta: { version: 2 },
          },
        },
      ],
    });

    const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create(), false);

    await installer.ensureCommonResourcesInstalled();

    const putComponentTemplateCalls = mockClusterClient.cluster.putComponentTemplate.mock.calls;
    expect(putComponentTemplateCalls).toHaveLength(4);
    const componentTemplateNames = putComponentTemplateCalls.map((call) => call[0].name);
    expect(componentTemplateNames).not.toContain(
      COMPOSITE_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME
    );

    const putIndexTemplateCalls = mockClusterClient.indices.putIndexTemplate.mock.calls;
    const indexTemplateNames = putIndexTemplateCalls.map((call) => call[0].name);
    expect(indexTemplateNames).not.toContain(COMPOSITE_SUMMARY_INDEX_TEMPLATE_NAME);

    const createCalls = mockClusterClient.indices.create.mock.calls;
    const createIndexNames = createCalls.map((call) => call[0].index);
    expect(createIndexNames).not.toContain('.slo-observability.composite-summary-v1');
    expect(mockClusterClient.indices.putMapping).not.toHaveBeenCalled();
  });
});
