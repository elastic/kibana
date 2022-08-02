/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getLogViewResponsePayloadRT,
  getLogViewUrl,
  PutLogViewRequestPayload,
  putLogViewRequestPayloadRT,
  putLogViewResponsePayloadRT,
} from '@kbn/infra-plugin/common/http_api/log_views';
import { decodeOrThrow } from '@kbn/infra-plugin/common/runtime_types';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraLogViewsServiceProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  const createGetLogViewAgent = (logViewId: string) =>
    supertest
      .get(getLogViewUrl(logViewId))
      .set({
        'kbn-xsrf': 'some-xsrf-token',
      })
      .send();

  const getLogView = async (logViewId: string) => {
    log.debug(`Fetching log view "${logViewId}"...`);

    const response = await createGetLogViewAgent(logViewId);

    return decodeOrThrow(getLogViewResponsePayloadRT)(response.body);
  };

  const createPutLogViewAgent = (logViewId: string, payload: PutLogViewRequestPayload) =>
    supertest
      .put(getLogViewUrl(logViewId))
      .set({
        'kbn-xsrf': 'some-xsrf-token',
      })
      .send(putLogViewRequestPayloadRT.encode(payload));

  const putLogView = async (logViewId: string, payload: PutLogViewRequestPayload) => {
    log.debug(`Storing log view "${logViewId}"...`);

    const response = await createPutLogViewAgent(logViewId, payload);

    return decodeOrThrow(putLogViewResponsePayloadRT)(response.body);
  };

  return {
    getLogView,
    putLogView,
  };
}
