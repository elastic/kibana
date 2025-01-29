/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import {
  CSP_GET_BENCHMARK_RULES_STATE_API_CURRENT_VERSION,
  CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH,
} from '@kbn/cloud-security-posture-common';
import type { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

export const getRuleStatesKey = ['get_rules_state_key'];

export const useGetCspBenchmarkRulesStatesApi = () => {
  const { http } = useKibana<CoreStart>().services;
  return useQuery<CspBenchmarkRulesStates, unknown, CspBenchmarkRulesStates>(getRuleStatesKey, () =>
    http.get<CspBenchmarkRulesStates>(CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH, {
      version: CSP_GET_BENCHMARK_RULES_STATE_API_CURRENT_VERSION,
    })
  );
};
