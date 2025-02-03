/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors as EsErrors } from '@elastic/elasticsearch';
import { createOrUpdateComponentTemplate } from './create_or_update_component_template';

const randomDelayMultiplier = 0.01;
const logger = loggingSystemMock.createLogger();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const componentTemplate: ClusterPutComponentTemplateRequest = {
  name: 'test-mappings',
  _meta: {
    managed: true,
  },
  template: {
    settings: {
      number_of_shards: 1,
      'index.mapping.total_fields.limit': 1500,
    },
    mappings: {
      dynamic: false,
      properties: {
        foo: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
    },
  },
};

describe('createOrUpdateComponentTemplate', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(global.Math, 'random').mockReturnValue(randomDelayMultiplier);
  });

  it(`should call esClient to put component template`, async () => {
    await createOrUpdateComponentTemplate({
      logger,
      esClient: clusterClient,
      template: componentTemplate,
      totalFieldsLimit: 2500,
    });

    expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledWith(componentTemplate);
  });

  it(`should retry on transient ES errors`, async () => {
    clusterClient.cluster.putComponentTemplate
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValue({ acknowledged: true });
    await createOrUpdateComponentTemplate({
      logger,
      esClient: clusterClient,
      template: componentTemplate,
      totalFieldsLimit: 2500,
    });

    expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(3);
  });

  it(`should log and throw error if max retries exceeded`, async () => {
    clusterClient.cluster.putComponentTemplate.mockRejectedValue(
      new EsErrors.ConnectionError('foo')
    );
    await expect(() =>
      createOrUpdateComponentTemplate({
        logger,
        esClient: clusterClient,
        template: componentTemplate,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error installing component template test-mappings - foo`
    );
    expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(4);
  });

  it(`should log and throw error if ES throws error`, async () => {
    clusterClient.cluster.putComponentTemplate.mockRejectedValue(new Error('generic error'));

    await expect(() =>
      createOrUpdateComponentTemplate({
        logger,
        esClient: clusterClient,
        template: componentTemplate,
        totalFieldsLimit: 2500,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"generic error"`);

    expect(logger.error).toHaveBeenCalledWith(
      `Error installing component template test-mappings - generic error`
    );
  });

  it(`should update index template field limit and retry if putTemplate throws error with field limit error`, async () => {
    clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(
      new EsErrors.ResponseError({
        body: 'illegal_argument_exception: Limit of total fields [1800] has been exceeded',
      } as DiagnosticResult)
    );
    const existingIndexTemplate = {
      name: 'test-template',
      index_template: {
        index_patterns: ['test*'],
        composed_of: ['test-mappings'],
        template: {
          settings: {
            auto_expand_replicas: '0-1',
            hidden: true,
            'index.lifecycle': {
              name: '.alerts-ilm-policy',
              rollover_alias: `.alerts-empty-default`,
            },
            'index.mapping.total_fields.limit': 1800,
          },
          mappings: {
            dynamic: false,
          },
        },
      },
    };

    clusterClient.indices.getIndexTemplate.mockResolvedValueOnce({
      index_templates: [existingIndexTemplate],
    });

    await createOrUpdateComponentTemplate({
      logger,
      esClient: clusterClient,
      template: componentTemplate,
      totalFieldsLimit: 2500,
    });

    expect(logger.info).toHaveBeenCalledWith('Updating total_fields.limit from 1800 to 2500');
    expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith({
      name: existingIndexTemplate.name,
      body: {
        ...existingIndexTemplate.index_template,
        template: {
          ...existingIndexTemplate.index_template.template,
          settings: {
            ...existingIndexTemplate.index_template.template?.settings,
            'index.mapping.total_fields.limit': 2500,
          },
        },
      },
    });
  });

  it(`should update index template field limit and retry if putTemplate throws error with field limit error when there are malformed index templates`, async () => {
    clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(
      new EsErrors.ResponseError({
        body: 'illegal_argument_exception: Limit of total fields [1800] has been exceeded',
      } as DiagnosticResult)
    );
    const existingIndexTemplate = {
      name: 'test-template',
      index_template: {
        index_patterns: ['test*'],
        composed_of: ['test-mappings'],
        template: {
          settings: {
            auto_expand_replicas: '0-1',
            hidden: true,
            'index.lifecycle': {
              name: '.alerts-ilm-policy',
              rollover_alias: `.alerts-empty-default`,
            },
            'index.mapping.total_fields.limit': 1800,
          },
          mappings: {
            dynamic: false,
          },
        },
      },
    };

    clusterClient.indices.getIndexTemplate.mockResolvedValueOnce({
      index_templates: [
        existingIndexTemplate,
        {
          name: 'lyndon',
          // @ts-expect-error
          index_template: {
            index_patterns: ['intel*'],
          },
        },
        {
          name: 'sample_ds',
          // @ts-expect-error
          index_template: {
            index_patterns: ['sample_ds-*'],
            data_stream: {
              hidden: false,
              allow_custom_routing: false,
            },
          },
        },
      ],
    });

    await createOrUpdateComponentTemplate({
      logger,
      esClient: clusterClient,
      template: componentTemplate,
      totalFieldsLimit: 2500,
    });

    expect(logger.info).toHaveBeenCalledWith('Updating total_fields.limit from 1800 to 2500');
    expect(clusterClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledWith({
      name: existingIndexTemplate.name,
      body: {
        ...existingIndexTemplate.index_template,
        template: {
          ...existingIndexTemplate.index_template.template,
          settings: {
            ...existingIndexTemplate.index_template.template?.settings,
            'index.mapping.total_fields.limit': 2500,
          },
        },
      },
    });
  });

  it(`should retry getIndexTemplate and putIndexTemplate on transient ES errors`, async () => {
    clusterClient.cluster.putComponentTemplate.mockRejectedValueOnce(
      new EsErrors.ResponseError({
        body: 'illegal_argument_exception: Limit of total fields [1800] has been exceeded',
      } as DiagnosticResult)
    );
    const existingIndexTemplate = {
      name: 'test-template',
      index_template: {
        index_patterns: ['test*'],
        composed_of: ['test-mappings'],
        template: {
          settings: {
            auto_expand_replicas: '0-1',
            hidden: true,
            'index.lifecycle': {
              name: '.alerts-ilm-policy',
              rollover_alias: `.alerts-empty-default`,
            },
            'index.mapping.total_fields.limit': 1800,
          },
          mappings: {
            dynamic: false,
          },
        },
      },
    };
    clusterClient.indices.getIndexTemplate
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValueOnce({
        index_templates: [existingIndexTemplate],
      });
    clusterClient.indices.putIndexTemplate
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockRejectedValueOnce(new EsErrors.TimeoutError('timeout'))
      .mockResolvedValue({ acknowledged: true });
    await createOrUpdateComponentTemplate({
      logger,
      esClient: clusterClient,
      template: componentTemplate,
      totalFieldsLimit: 2500,
    });

    expect(logger.info).toHaveBeenCalledWith('Updating total_fields.limit from 1800 to 2500');
    expect(clusterClient.indices.getIndexTemplate).toHaveBeenCalledTimes(3);
    expect(clusterClient.indices.putIndexTemplate).toHaveBeenCalledTimes(3);
  });
});
