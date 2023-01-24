/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PartialMetricsSourceConfiguration,
  MetricsSourceConfigurationResponse,
} from '@kbn/infra-plugin/common/metrics_sources';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraOpsSourceConfigurationProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const patchRequest = async (
    body: PartialMetricsSourceConfiguration
  ): Promise<MetricsSourceConfigurationResponse | undefined> => {
    const response = await supertest
      .patch('/api/metrics/source/default')
      .set('kbn-xsrf', 'xxx')
      .send(body)
      .expect(200);
    return response.body;
  };

  return {
    async createConfiguration(
      sourceId: string,
      sourceProperties: PartialMetricsSourceConfiguration
    ) {
      log.debug(
        `Creating Infra UI source configuration "${sourceId}" with properties ${JSON.stringify(
          sourceProperties
        )}`
      );

      const response = await patchRequest(sourceProperties);
      return response?.source.version;
    },
  };
}
