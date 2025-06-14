/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { GetThreatListOptions } from './types';
import { getSharedParamsMock } from '../../__mocks__/shared_params';
import { getThreatRuleParams } from '../../../rule_schema/mocks';

const esClient = elasticsearchServiceMock.createElasticsearchClient();

export const threatSearchParamsMock: GetThreatListOptions = {
  sharedParams: getSharedParamsMock({ ruleParams: getThreatRuleParams() }),
  esClient,
  threatFilters: [],
  threatListConfig: {
    _source: false,
    fields: undefined,
  },
  pitId: 'mock',
  reassignPitId: jest.fn(),
  searchAfter: undefined,
  indexFields: [],
};
