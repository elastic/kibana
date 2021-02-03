/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraSavedSourceConfiguration,
  SourceResponse,
} from '../../../plugins/infra/common/http_api/source_api';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraOpsSourceConfigurationProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const patchRequest = async (
    body: InfraSavedSourceConfiguration
  ): Promise<SourceResponse | undefined> => {
    const response = await supertest
      .patch('/api/metrics/source/default')
      .set('kbn-xsrf', 'xxx')
      .send(body)
      .expect(200);
    return response.body;
  };

  return {
    async createConfiguration(sourceId: string, sourceProperties: InfraSavedSourceConfiguration) {
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
