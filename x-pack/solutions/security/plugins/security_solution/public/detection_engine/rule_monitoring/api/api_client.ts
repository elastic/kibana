/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

import { KibanaServices } from '../../../common/lib/kibana';

import type {
  GetRuleHealthRequestBody,
  GetRuleHealthResponse,
  GetSpaceHealthRequestBody,
  GetSpaceHealthResponse,
  ReadRuleExecutionResultsResponse,
} from '../../../../common/api/detection_engine/rule_monitoring';
import {
  GET_RULE_HEALTH_URL,
  GET_SPACE_HEALTH_URL,
  readRuleExecutionResultsUrl,
  SETUP_HEALTH_URL,
} from '../../../../common/api/detection_engine/rule_monitoring';

import type {
  IRuleMonitoringApiClient,
  ReadRuleExecutionResultsArgs,
} from './api_client_interface';

export const api: IRuleMonitoringApiClient = {
  setupDetectionEngineHealthApi: async (): Promise<void> => {
    await http().fetch(SETUP_HEALTH_URL, {
      version: '1',
      method: 'POST',
    });
  },

  readRuleExecutionResults: (
    args: ReadRuleExecutionResultsArgs
  ): Promise<ReadRuleExecutionResultsResponse> => {
    const { ruleId, filter, sort, page, perPage, signal } = args;
    const url = readRuleExecutionResultsUrl(ruleId);

    const finalFilter = filter
      ? {
          ...filter,
          from: dateMath.parse(filter.from)?.toISOString(),
          // roundUp: true so that e.g. "now/d" resolves to end-of-day, not start-of-day
          to: dateMath.parse(filter.to, { roundUp: true })?.toISOString(),
        }
      : undefined;

    return http().fetch<ReadRuleExecutionResultsResponse>(url, {
      method: 'POST',
      version: '1',
      body: JSON.stringify({ filter: finalFilter, sort, page, per_page: perPage }),
      signal,
    });
  },

  fetchSpaceRulesHealth: async (
    params: GetSpaceHealthRequestBody,
    signal?: AbortSignal
  ): Promise<GetSpaceHealthResponse> =>
    KibanaServices.get().http.fetch<GetSpaceHealthResponse>(GET_SPACE_HEALTH_URL, {
      method: 'POST',
      version: '1',
      body: JSON.stringify(params),
      signal,
    }),

  fetchRuleHealth: async (
    params: GetRuleHealthRequestBody,
    signal?: AbortSignal
  ): Promise<GetRuleHealthResponse> =>
    KibanaServices.get().http.fetch<GetRuleHealthResponse>(GET_RULE_HEALTH_URL, {
      method: 'POST',
      version: '1',
      body: JSON.stringify(params),
      signal,
    }),
};

const http = () => KibanaServices.get().http;
