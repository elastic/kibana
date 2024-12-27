/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import type { IEsSearchResponse } from '@kbn/search-types';

import type { SearchSecureService } from '@kbn/test-suites-serverless/shared/services/search_secure';
import type { SearchService, SendOptions } from '@kbn/ftr-common-functional-services';

export interface SecuritySolutionServerlessSearch extends Omit<SearchSecureService, 'send'> {
  send: <T extends IEsSearchResponse>(options: SendOptions) => Promise<T>;
}

export interface SecuritySolutionUtilsInterface {
  getUsername: (role?: string) => Promise<string>;
  createSuperTest: (role?: string) => Promise<TestAgent<any>>;
  createSearch: (role?: string) => Promise<SecuritySolutionServerlessSearch>;
}

export interface SecuritySolutionESSUtilsInterface {
  getUsername: (role?: string) => Promise<string>;
  createSearch: (role?: string) => Promise<SearchService>;
  createSuperTest: (role?: string, password?: string) => Promise<TestAgent<any>>;
}
