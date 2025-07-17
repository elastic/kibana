/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageRecord, MeteringCallbackInput, MeteringCallBackResponse } from '../../types';
import type { ServerlessSecurityConfig } from '../../config';
import { ProductLine } from '../../../common/product';
import { METERING_TASK } from '../constants/metering';

export class Ai4SocMeteringService {
  // only run metering if ai4soc add-on is enabled
  public shouldMeter = (config: ServerlessSecurityConfig) => {
    return !!this.getAiSocProduct(config);
  };

  public getUsageRecords = async ({
    taskId,
    cloudSetup,
    config,
    logger,
  }: MeteringCallbackInput): Promise<MeteringCallBackResponse> => {
    const product = this.getAiSocProduct(config);

    if (!product) {
      return { records: [] };
    }

    const projectId = cloudSetup?.serverless?.projectId;
    const timestamp = new Date();
    if (!projectId) {
      logger.error(
        `ai4soc metering failed due to missing project id. taskId ${taskId} at ${timestamp.toISOString()}`
      );
      return { records: [] };
    }

    const record = this.buildMeteringRecord({
      timestampStr: timestamp.toISOString(),
      taskId,
      projectId,
      product,
    });

    return { latestTimestamp: timestamp, records: [record], shouldRunAgain: false };
  };

  private buildMeteringRecord({
    timestampStr,
    taskId,
    projectId,
    product,
  }: {
    timestampStr: string;
    taskId: string;
    projectId: string;
    product: ServerlessSecurityConfig['productTypes'][number];
  }): UsageRecord {
    // truncate to hour
    const timestamp = new Date(timestampStr);
    timestamp.setMinutes(0);
    timestamp.setSeconds(0);
    timestamp.setMilliseconds(0);

    const usageRecord = {
      // unique by project + hour
      id: `ai4soc-${projectId}-${timestamp.toISOString()}`,
      usage_timestamp: timestampStr,
      creation_timestamp: timestampStr,
      usage: {
        type: METERING_TASK.USAGE_TYPE,
        period_seconds: METERING_TASK.SAMPLE_PERIOD_SECONDS,
        quantity: 1,
      },
      source: {
        id: taskId,
        instance_group_id: projectId,
        metadata: {
          tier: product.product_tier,
        },
      },
    };

    return usageRecord;
  }

  private getAiSocProduct(
    config: ServerlessSecurityConfig
  ): (typeof config.productTypes)[number] | undefined {
    return config.productTypes.find((productType) => {
      return productType.product_line === ProductLine.aiSoc;
    });
  }
}

export const ai4SocMeteringService = new Ai4SocMeteringService();
