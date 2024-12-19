/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH } from '@kbn/cloud-security-posture-common';
import type { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { useKibana } from '../../common/hooks/use_kibana';

export const CSP_RULES_STATES_QUERY_KEY = ['csp_rules_states_v1'];

export const useCspGetRulesStates = () => {
  const { http } = useKibana().services;

  return useQuery(
    CSP_RULES_STATES_QUERY_KEY,
    () =>
      http.get<CspBenchmarkRulesStates>(CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH, {
        version: '1',
      }),
    { keepPreviousData: true }
  );
};
