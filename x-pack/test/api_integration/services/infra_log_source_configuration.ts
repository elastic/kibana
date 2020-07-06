/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getLogSourceConfigurationPath,
  getLogSourceConfigurationSuccessResponsePayloadRT,
  PatchLogSourceConfigurationRequestBody,
  patchLogSourceConfigurationRequestBodyRT,
  patchLogSourceConfigurationResponsePayloadRT,
} from '../../../plugins/infra/common/http_api/log_sources';
import { decodeOrThrow } from '../../../plugins/infra/common/runtime_types';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraLogSourceConfigurationProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  const createGetLogSourceConfigurationAgent = (sourceId: string) =>
    supertest
      .get(getLogSourceConfigurationPath(sourceId))
      .set({
        'kbn-xsrf': 'some-xsrf-token',
      })
      .send();

  const getLogSourceConfiguration = async (sourceId: string) => {
    log.debug(`Fetching Logs UI source configuration "${sourceId}"`);

    const response = await createGetLogSourceConfigurationAgent(sourceId);

    return decodeOrThrow(getLogSourceConfigurationSuccessResponsePayloadRT)(response.body);
  };

  const createUpdateLogSourceConfigurationAgent = (
    sourceId: string,
    sourceProperties: PatchLogSourceConfigurationRequestBody['data']
  ) =>
    supertest
      .patch(getLogSourceConfigurationPath(sourceId))
      .set({
        'kbn-xsrf': 'some-xsrf-token',
      })
      .send(patchLogSourceConfigurationRequestBodyRT.encode({ data: sourceProperties }));

  const updateLogSourceConfiguration = async (
    sourceId: string,
    sourceProperties: PatchLogSourceConfigurationRequestBody['data']
  ) => {
    log.debug(
      `Updating Logs UI source configuration "${sourceId}" with properties ${JSON.stringify(
        sourceProperties
      )}`
    );

    const response = await createUpdateLogSourceConfigurationAgent(sourceId, sourceProperties);

    return decodeOrThrow(patchLogSourceConfigurationResponsePayloadRT)(response.body);
  };

  return {
    createGetLogSourceConfigurationAgent,
    createUpdateLogSourceConfigurationAgent,
    getLogSourceConfiguration,
    updateLogSourceConfiguration,
  };
}
