/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { ListResult } from '@kbn/fleet-plugin/common';
import { CURRENT_API_VERSION, POLICIES_ROUTE_PATH } from '../../../common/constants';
import type { PoliciesQueryParams } from '../../../common';
import { useKibana } from '../../common/hooks/use_kibana';
import type { CloudDefendPolicy } from '../../../common';

const QUERY_KEY = 'cloud_defend_policies';

export interface UseCloudDefendPoliciesProps {
  name: string;
  page: number;
  perPage: number;
  sortField: PoliciesQueryParams['sort_field'];
  sortOrder: PoliciesQueryParams['sort_order'];
}

export const useCloudDefendPolicies = ({
  name,
  perPage,
  page,
  sortField,
  sortOrder,
}: UseCloudDefendPoliciesProps) => {
  const { http } = useKibana().services;
  const query: PoliciesQueryParams = {
    policy_name: name,
    per_page: perPage,
    page,
    sort_field: sortField,
    sort_order: sortOrder,
  };

  return useQuery(
    [QUERY_KEY, query],
    () =>
      http.get<ListResult<CloudDefendPolicy>>(POLICIES_ROUTE_PATH, {
        version: CURRENT_API_VERSION,
        query,
      }),
    { keepPreviousData: true }
  );
};
