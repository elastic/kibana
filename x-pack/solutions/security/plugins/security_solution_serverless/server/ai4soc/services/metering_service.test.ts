/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { ServerlessSecurityConfig } from '../../config';
import type { MeteringCallbackInput } from '../../types';
import { ProductLine, ProductTier } from '../../../common/product';
import { METERING_TASK } from '../constants/metering';

import { Ai4SocMeteringService } from './metering_service';

describe('Ai4SocMeteringService', () => {
  let meteringService: Ai4SocMeteringService;
  let logger: jest.Mocked<Logger>;

  const getDefaultConfig = (): ServerlessSecurityConfig =>
    ({
      productTypes: [
        {
          product_line: ProductLine.aiSoc,
          product_tier: ProductTier.essentials,
        },
      ],
    } as ServerlessSecurityConfig);

  function buildDefaultUsageRecordArgs(): MeteringCallbackInput {
    logger = loggingSystemMock.createLogger();
    return {
      logger,
      taskId: 'test-task-id',
      cloudSetup: {
        serverless: {
          projectId: 'test-project-id',
        },
      } as CloudSetup,
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      abortController: new AbortController(),
      lastSuccessfulReport: new Date(),
      config: getDefaultConfig(),
    };
  }

  beforeEach(() => {
    meteringService = new Ai4SocMeteringService();
  });

  describe('shouldMeter', () => {
    it('returns true when ai4soc product is configured', () => {
      const args = buildDefaultUsageRecordArgs();
      expect(meteringService.shouldMeter(args.config)).toBe(true);
    });

    it('returns false when ai4soc product is not configured', () => {
      const config: ServerlessSecurityConfig = {
        productTypes: [
          {
            product_line: ProductLine.endpoint,
            product_tier: ProductTier.essentials,
          },
        ],
      } as ServerlessSecurityConfig;

      expect(meteringService.shouldMeter(config)).toBe(false);
    });
  });

  describe('getUsageRecords', () => {
    it.each(Object.values(ProductTier))(
      'can correctly getUsageRecords for %s tier',
      async (tier: ProductTier) => {
        const timestamp = new Date();
        timestamp.setMinutes(0);
        timestamp.setSeconds(0);
        timestamp.setMilliseconds(0);

        const args = buildDefaultUsageRecordArgs();
        args.config = {
          productTypes: [
            {
              product_line: ProductLine.aiSoc,
              product_tier: tier,
            },
          ],
        } as ServerlessSecurityConfig;

        const { records } = await meteringService.getUsageRecords(args);

        expect(records[0]).toEqual({
          id: `ai4soc-${args.cloudSetup.serverless.projectId}-${timestamp.toISOString()}`,
          usage_timestamp: expect.any(String),
          creation_timestamp: expect.any(String),
          usage: {
            type: METERING_TASK.USAGE_TYPE,
            period_seconds: METERING_TASK.SAMPLE_PERIOD_SECONDS,
            quantity: 1,
          },
          source: {
            id: args.taskId,
            instance_group_id: args.cloudSetup.serverless.projectId,
            metadata: {
              tier,
            },
          },
        });
      }
    );

    it('returns empty records array when ai4soc product is not configured', async () => {
      const args = buildDefaultUsageRecordArgs();
      args.config = {
        productTypes: [
          {
            product_line: ProductLine.endpoint,
            product_tier: ProductTier.essentials,
          },
        ],
      } as ServerlessSecurityConfig;

      const { records } = await meteringService.getUsageRecords(args);

      expect(records).toEqual([]);
    });

    it('returns empty records array and logs error when projectId is missing', async () => {
      const args = buildDefaultUsageRecordArgs();
      args.cloudSetup = {
        serverless: {},
      } as CloudSetup;

      const { records } = await meteringService.getUsageRecords(args);

      expect(records).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('ai4soc metering failed due to missing project id')
      );
    });
  });
});
