/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { IEsSearchResponse } from '@kbn/search-types';

import { BsearchSecureService } from '../../../../test_serverless/shared/services/bsearch_secure';
import type { SendOptions } from '../../../../../test/common/services/bsearch';

interface SecuritySolutionServerlessBsearch extends Omit<BsearchSecureService, 'send'> {
  send: <T extends IEsSearchResponse>(options: SendOptions) => Promise<T>;
}

export interface SecuritySolutionUtils {
  getUsername: (role?: string) => Promise<string>;
  createSuperTest: (role?: string) => Promise<TestAgent<any>>;
  createBsearch: (role?: string) => Promise<SecuritySolutionServerlessBsearch>;
}
