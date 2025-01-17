/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { GetThreatListOptions } from './types';
import { getListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';

const esClient = elasticsearchServiceMock.createElasticsearchClient();
const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();

export const threatSearchParamsMock: GetThreatListOptions = {
  esClient,
  query: '*:*',
  language: 'kuery',
  threatFilters: [],
  index: ['threats-*'],
  ruleExecutionLogger,
  threatListConfig: {
    _source: false,
    fields: undefined,
  },
  pitId: 'mock',
  reassignPitId: jest.fn(),
  listClient: getListClientMock(),
  searchAfter: undefined,
  runtimeMappings: undefined,
  exceptionFilter: undefined,
  indexFields: [],
};
