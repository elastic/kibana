/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type { SendOptions } from '../../../../../test/common/services/bsearch';
import {
  BsearchSecureService,
  SendOptions as SecureBsearchSendOptions,
} from '../../../../test_serverless/shared/services/bsearch_secure';

export class SecuritySolutionServerlessBsearchInitializer extends BsearchSecureService {
  async send<T extends IEsSearchResponse>(
    sendOptions: SendOptions,
    serverlessOptions = { apiKeyHeader: { Authorization: '' } }
  ): Promise<T> {
    const { supertest: supertest, ...rest } = sendOptions;
    const params: SecureBsearchSendOptions = {
      ...rest,
      supertestWithoutAuth: supertest,
      apiKeyHeader: serverlessOptions.apiKeyHeader,
      internalOrigin: 'Kibana',
    };
    return super.send<T>(params);
  }
}
