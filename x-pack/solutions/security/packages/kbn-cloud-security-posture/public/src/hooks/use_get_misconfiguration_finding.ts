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

import { buildGetMisconfigurationsFindingsQuery } from '../utils/hooks_utils';

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

export const useGetMisconfigurationFindings = (options: UseCspOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;

  return useQuery(
    ['csp_misconfiguration_findings', { params: options }],
    async () => {
      const {
        rawResponse: { hits, aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: buildGetMisconfigurationsFindingsQuery(
            options
          ) as LatestFindingsRequest['params'],
        })
      );
      if (!aggregations && options.ignore_unavailable === false)
        throw new Error('expected aggregations to be defined');
      return {
        result: hits,
      };
    },
    {
      enabled: options.enabled,
      keepPreviousData: false,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
