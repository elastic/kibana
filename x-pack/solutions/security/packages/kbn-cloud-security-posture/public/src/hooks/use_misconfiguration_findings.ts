/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { CspFinding } from '@kbn/cloud-security-posture-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { showErrorToast } from '../..';
import type {
  CspClientPluginStartDeps,
  LatestFindingsRequest,
  LatestFindingsResponse,
  UseCspOptions,
} from '../types';

import { useGetCspBenchmarkRulesStatesApi } from './use_get_benchmark_rules_state_api';
import {
  buildMisconfigurationsFindingsQuery,
  getMisconfigurationAggregationCount,
} from '../utils/findings_query_builders';

export enum MISCONFIGURATION {
  RESULT_EVALUATION = 'result.evaluation',
  RULE_NAME = 'rule.name',
}
export interface MisconfigurationFindingTableDetailsFields {
  [MISCONFIGURATION.RESULT_EVALUATION]: string;
  [MISCONFIGURATION.RULE_NAME]: string;
}

export type MisconfigurationFindingDetailFields = Pick<CspFinding, 'rule' | 'resource'> &
  MisconfigurationFindingTableDetailsFields;

export const useMisconfigurationFindings = (options: UseCspOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;
  const { data: rulesStates } = useGetCspBenchmarkRulesStatesApi();

  return useQuery(
    ['csp_misconfiguration_findings', { params: options }, rulesStates],
    async () => {
      const {
        rawResponse: { hits, aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: buildMisconfigurationsFindingsQuery(
            options,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            rulesStates!
          ) as LatestFindingsRequest['params'],
        })
      );
      if (!aggregations && options.ignore_unavailable === false)
        throw new Error('expected aggregations to be defined');

      return {
        count: getMisconfigurationAggregationCount(aggregations?.count.buckets),
        rows: hits.hits.map((finding) => ({
          rule: finding?._source?.rule,
          resource: finding?._source?.resource,
          [MISCONFIGURATION.RULE_NAME]: finding?._source?.rule?.name,
          [MISCONFIGURATION.RESULT_EVALUATION]: finding._source?.result?.evaluation,
        })) as MisconfigurationFindingDetailFields[],
      };
    },
    {
      enabled: options.enabled && !!rulesStates,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
