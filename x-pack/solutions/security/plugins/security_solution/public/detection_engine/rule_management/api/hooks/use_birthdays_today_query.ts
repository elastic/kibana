/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { BirthdaysTodayResponse } from '../../../../../common/api/detection_engine/rule_management';
import { RULE_MANAGEMENT_BIRTHDAYS_TODAY_URL } from '../../../../../common/api/detection_engine/rule_management/urls';
import { fetchBirthdaysToday } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

export interface BirthdaysTodayQueryArgs {
  birthdayDate?: string;
}

const BIRTHDAYS_TODAY_QUERY_KEY = ['GET', RULE_MANAGEMENT_BIRTHDAYS_TODAY_URL];

export const useBirthdaysTodayQuery = (
  queryArgs: BirthdaysTodayQueryArgs,
  queryOptions?: UseQueryOptions<
    BirthdaysTodayResponse,
    Error,
    BirthdaysTodayResponse,
    [...string[], BirthdaysTodayQueryArgs]
  >
) => {
  return useQuery(
    [...BIRTHDAYS_TODAY_QUERY_KEY, queryArgs],
    ({ signal }) => fetchBirthdaysToday({ signal, ...queryArgs }),
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...queryOptions,
    }
  );
};
