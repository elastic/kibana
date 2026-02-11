/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetRuleHealthRequestBody,
  GetRuleHealthResponse,
  GetSpaceHealthRequestBody,
  GetSpaceHealthResponse,
} from '../../../../common/api/detection_engine';
import { GET_RULE_HEALTH_URL, GET_SPACE_HEALTH_URL } from '../../../../common/api/detection_engine';
import { KibanaServices } from '../../../common/lib/kibana';

/**
 * Fetches health overview of all detection rules in the current Kibana space.
 *
 * @param params GetSpaceHealthRequestBody request parameters
 * @param signal to cancel request
 *
 * @returns Promise<GetSpaceHealthResponse> The health overview of all detection rules in the current Kibana space
 *
 * @throws An error if response is not OK
 */
export const fetchSpaceRulesHealth = async (
  params: GetSpaceHealthRequestBody,
  signal?: AbortSignal
): Promise<GetSpaceHealthResponse> =>
  KibanaServices.get().http.fetch<GetSpaceHealthResponse>(GET_SPACE_HEALTH_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify(params),
    signal,
  });
/**
 * Fetches health overview of a specific detection rule in the current Kibana space.
 *
 * @param params GetRuleHealthRequestBody request parameters
 * @param signal to cancel request
 *
 * @returns Promise<GetRuleHealthResponse> The health overview of a specific detection rule in the current Kibana space
 *
 * @throws An error if response is not OK
 */
export const fetchRuleHealth = async (
  params: GetRuleHealthRequestBody,
  signal?: AbortSignal
): Promise<GetRuleHealthResponse> =>
  KibanaServices.get().http.fetch<GetRuleHealthResponse>(GET_RULE_HEALTH_URL, {
    method: 'POST',
    version: '1',
    body: JSON.stringify(params),
    signal,
  });
