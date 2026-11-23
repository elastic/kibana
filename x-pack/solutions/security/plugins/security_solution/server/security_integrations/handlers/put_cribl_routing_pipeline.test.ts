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
    } as unknown as jest.Mocked<ElasticsearchClient>;
    logger = createLogger();
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
