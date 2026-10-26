/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { SECURITY_INTEGRATIONS_CRIBL_ROUTING_PIPELINE } from '../../../common/constants';
import { putCriblRoutingPipeline } from './put_cribl_routing_pipeline';

const createLogger = (): Logger =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger);

const createPolicy = (routeEntriesJson: string): NewPackagePolicy =>
  ({
    name: 'cribl-1',
    namespace: 'default',
    enabled: true,
    policy_ids: ['policy-1'],
    inputs: [],
    package: { name: 'cribl', title: 'Cribl', version: '1.0.0' },
    vars: {
      route_entries: {
        value: routeEntriesJson,
        type: 'textarea',
      },
    },
  } as unknown as NewPackagePolicy);

describe('putCriblRoutingPipeline', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: Logger;

  beforeEach(() => {
    esClient = {
      transport: {
        request: jest.fn().mockResolvedValue({ acknowledged: true }),
      },
      indices: {
        getIndexTemplate: jest.fn().mockResolvedValue({}),
      },
    } as unknown as jest.Mocked<ElasticsearchClient>;
    logger = createLogger();
  });

  const mockIndexTemplates = (templates: Array<{ name: string; indexPatterns: string[] }>) => {
    (esClient.indices.getIndexTemplate as jest.Mock).mockResolvedValue({
      index_templates: templates.map(({ name, indexPatterns }) => ({
        name,
        index_template: { index_patterns: indexPatterns },
      })),
    });
  };

  const getPutRerouteDatasets = (): string[] => {
    const [[{ body }]] = (esClient.transport.request as jest.Mock).mock.calls;
    return body.processors.map(
      (processor: { reroute: { dataset: string } }) => processor.reroute.dataset
    );
  };

  it('routes to the dataset from the index pattern of an OTel input template', async () => {
    mockIndexTemplates([
      { name: 'logs-claude_cowork.events', indexPatterns: ['logs-claude_cowork.events.otel-*'] },
    ]);
    const policy = createPolicy('[{"dataId":"claude","datastream":"logs-claude_cowork.events"}]');

    await putCriblRoutingPipeline(esClient, policy, logger);

    expect(getPutRerouteDatasets()).toEqual(['claude_cowork.events.otel']);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('keeps the template name dataset for regular templates', async () => {
    mockIndexTemplates([{ name: 'logs-nginx.access', indexPatterns: ['logs-nginx.access-*'] }]);
    const policy = createPolicy('[{"dataId":"nginx","datastream":"logs-nginx.access"}]');

    await putCriblRoutingPipeline(esClient, policy, logger);

    expect(getPutRerouteDatasets()).toEqual(['nginx.access']);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns and falls back to the template name when the template is not found', async () => {
    const policy = createPolicy('[{"dataId":"missing","datastream":"logs-missing.dataset"}]');

    await putCriblRoutingPipeline(esClient, policy, logger);

    expect(getPutRerouteDatasets()).toEqual(['missing.dataset']);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Cribl route for _dataId "missing" could not be resolved')
    );
  });

  it('warns and falls back to template names when index templates cannot be read', async () => {
    (esClient.indices.getIndexTemplate as jest.Mock).mockRejectedValue(new Error('forbidden'));
    const policy = createPolicy('[{"dataId":"claude","datastream":"logs-claude_cowork.events"}]');

    await putCriblRoutingPipeline(esClient, policy, logger);

    expect(getPutRerouteDatasets()).toEqual(['claude_cowork.events']);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to read index templates for the Cribl routing pipeline')
    );
  });

  it('does not read index templates when there are no route entries', async () => {
    const policy = createPolicy('[]');

    await putCriblRoutingPipeline(esClient, policy, logger);

    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
  });

  it('puts the routing pipeline for valid mappings', async () => {
    const policy = createPolicy(
      '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud"}]'
    );

    await putCriblRoutingPipeline(esClient, policy, logger);

    expect(esClient.transport.request).toHaveBeenCalledTimes(1);
    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'PUT',
      path: `_ingest/pipeline/${SECURITY_INTEGRATIONS_CRIBL_ROUTING_PIPELINE}`,
      body: expect.objectContaining({
        processors: [
          expect.objectContaining({
            reroute: expect.objectContaining({
              if: "ctx['_dataId'] == 'criblSource1'",
              dataset: 'destination1.cloud',
            }),
          }),
        ],
      }),
    });
  });

  it('rejects invalid dataId and does not put the pipeline', async () => {
    const policy = createPolicy(
      `[{"dataId":"x' || true || 'y","datastream":"logs-destination1.cloud"}]`
    );

    await expect(putCriblRoutingPipeline(esClient, policy, logger)).rejects.toMatchObject({
      message: expect.stringMatching(/Invalid Cribl dataId/),
      statusCode: 400,
      apiPassThrough: true,
    });
    expect(esClient.transport.request).not.toHaveBeenCalled();
  });

  it('rejects invalid namespace and does not put the pipeline', async () => {
    const policy = createPolicy(
      '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud","namespace":"bad space"}]'
    );

    await expect(putCriblRoutingPipeline(esClient, policy, logger)).rejects.toMatchObject({
      message: expect.stringMatching(/Invalid Cribl namespace/),
      statusCode: 400,
      apiPassThrough: true,
    });
    expect(esClient.transport.request).not.toHaveBeenCalled();
  });

  it('fails the entire put when one of multiple entries is invalid', async () => {
    const policy = createPolicy(
      '[{"dataId":"validSource","datastream":"logs-destination1.cloud"},{"dataId":"bad\'id","datastream":"logs-destination2"}]'
    );

    await expect(putCriblRoutingPipeline(esClient, policy, logger)).rejects.toThrow(
      /Invalid Cribl dataId/
    );
    expect(esClient.transport.request).not.toHaveBeenCalled();
  });

  it('does not throw for empty route entries', async () => {
    const policy = createPolicy('[]');

    await putCriblRoutingPipeline(esClient, policy, logger);

    expect(esClient.transport.request).toHaveBeenCalledTimes(1);
  });

  it('rethrows Elasticsearch failures with apiPassThrough', async () => {
    (esClient.transport.request as jest.Mock).mockRejectedValue({
      statusCode: 403,
      message: 'forbidden',
    });
    const policy = createPolicy(
      '[{"dataId":"criblSource1","datastream":"logs-destination1.cloud"}]'
    );

    await expect(putCriblRoutingPipeline(esClient, policy, logger)).rejects.toMatchObject({
      message: expect.stringContaining('Failed to put Cribl integration routing pipeline'),
      apiPassThrough: true,
      statusCode: 403,
    });
  });
});
