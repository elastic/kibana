/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_INDEX_TEMPLATE_NAME,
  SLO_RESOURCES_VERSION,
  SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME,
  SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME,
  SLO_SUMMARY_INDEX_TEMPLATE_NAME,
} from '../../common/constants';
import { DefaultResourceInstaller } from './resource_installer';

describe('resourceInstaller', () => {
  it('installs the common resources when there is a version mismatch', async () => {
    const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
    mockClusterClient.cluster.getComponentTemplate.mockResponse({
      component_templates: [
        {
          name: SLO_INDEX_TEMPLATE_NAME,
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
          name: SLO_INDEX_TEMPLATE_NAME,
          index_template: {
            index_patterns: SLO_INDEX_TEMPLATE_NAME,
            composed_of: [SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME],
            _meta: {
              version: 2,
            },
          },
        },
      ],
    });

    const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create());

    await installer.ensureCommonResourcesInstalled();

    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: SLO_COMPONENT_TEMPLATE_MAPPINGS_NAME })
    );
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: SLO_COMPONENT_TEMPLATE_SETTINGS_NAME })
    );
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ name: SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME })
    );
    expect(mockClusterClient.cluster.putComponentTemplate).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ name: SLO_SUMMARY_COMPONENT_TEMPLATE_SETTINGS_NAME })
    );
    expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
    expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: SLO_INDEX_TEMPLATE_NAME })
    );
    expect(mockClusterClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: SLO_SUMMARY_INDEX_TEMPLATE_NAME })
    );
  });

  it('does not install the common resources when there is a version match', async () => {
    const mockClusterClient = elasticsearchServiceMock.createElasticsearchClient();
    mockClusterClient.cluster.getComponentTemplate.mockResponse({
      component_templates: [
        {
          name: SLO_INDEX_TEMPLATE_NAME,
          component_template: {
            _meta: {
              version: SLO_RESOURCES_VERSION,
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
          name: SLO_INDEX_TEMPLATE_NAME,
          index_template: {
            index_patterns: SLO_INDEX_TEMPLATE_NAME,
            composed_of: [SLO_SUMMARY_COMPONENT_TEMPLATE_MAPPINGS_NAME],
            _meta: {
              version: SLO_RESOURCES_VERSION,
            },
          },
        },
      ],
    });

    const installer = new DefaultResourceInstaller(mockClusterClient, loggerMock.create());

    await installer.ensureCommonResourcesInstalled();

    expect(mockClusterClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(mockClusterClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });
});
