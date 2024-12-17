/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_URL_FIND,
} from '../../../common/constants';
import type {
  CreateRuleRequestBody,
  FindRulesRequestQuery,
  FindRulesResponse,
  RuleResponse,
} from '../../../common/api/detection_engine';

/**
 * Creates a detection engine rule
 * @param kbnClient
 * @param payload
 */
export const createRule = async (
  kbnClient: KbnClient,
  payload: Partial<CreateRuleRequestBody> = {}
): Promise<RuleResponse> => {
  return kbnClient
    .request<RuleResponse>({
      path: DETECTION_ENGINE_RULES_URL,
      method: 'POST',
      body: {
        type: 'query',
        index: [
          'apm-*-transaction*',
          'auditbeat-*',
          'endgame-*',
          'filebeat-*',
          'logs-*',
          'packetbeat-*',
          'traces-apm*',
          'winlogbeat-*',
          '-*elastic-cloud-logs-*',
        ],
        filters: [],
        language: 'kuery',
        query: '_id:*',
        author: [],
        false_positives: [],
        references: [],
        risk_score: 21,
        risk_score_mapping: [],
        severity: 'low',
        severity_mapping: [],
        threat: [],
        name: `Test rule - ${Math.random().toString(36).substring(2)}`,
        description: `Test rule created from: ${__filename}`,
        tags: [],
        license: '',
        interval: '1m',
        from: 'now-120s',
        to: 'now',
        meta: {
          from: '1m',
          kibana_siem_app_url: kbnClient.resolveUrl('/app/security'),
        },
        actions: [],
        enabled: true,
        throttle: 'no_actions',

        ...payload,
      },
      headers: { 'elastic-api-version': '2023-10-31' },
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};

/**
 * Query the Detection Rules
 * @param kbnClient
 * @param query
 */
export const findRules = async (
  kbnClient: KbnClient,
  query: Partial<FindRulesRequestQuery> = {}
): Promise<FindRulesResponse> => {
  return kbnClient
    .request<FindRulesResponse>({
      path: DETECTION_ENGINE_RULES_URL_FIND,
      method: 'GET',
      headers: { 'elastic-api-version': '2023-10-31' },
      query,
    })
    .catch(catchAxiosErrorFormatAndThrow)
    .then((response) => response.data);
};
