/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { IExecutionLog, IExecutionLogResult } from '@kbn/alerting-plugin/common';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import datemath from '@kbn/datemath';
import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useCallback, useRef } from 'react';

import { useAppToasts } from '../../../../../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

type ServerError = IHttpFetchError<ResponseErrorBody>;

const DEFAULT_DATE_END = 'now';
const DEFAULT_DATE_START = 'now-24h';
const DEFAULT_PER_PAGE = 100;

interface Props {
  dateEnd?: string;
  dateStart?: string;
  http: HttpSetup;
  isAssistantEnabled: boolean;
  perPage?: number;
  refetchOnWindowFocus?: boolean;
  ruleId: string;
}

interface UseGetScheduleExecutionLogs {
  data: IExecutionLog[] | undefined;
  error: unknown | undefined;
  isLoading: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<IExecutionLog[], unknown>>;
  status: 'error' | 'idle' | 'loading' | 'success';
}

const getParsedDate = (date: string): string => {
  if (date.includes('now')) {
    return datemath.parse(date)?.toISOString() ?? date;
  }

  return date;
};

/**
 * Fetches the Alerting Framework execution log for a schedule's rule. This
 * returns *every* run (including failures that produced no generation), keyed
 * by the rule execution UUID (`IExecutionLog.id`), which matches the
 * `execution_uuid` of any corresponding attack discovery generation.
 */
export const useGetScheduleExecutionLogs = ({
  dateEnd = DEFAULT_DATE_END,
  dateStart = DEFAULT_DATE_START,
  http,
  isAssistantEnabled,
  perPage = DEFAULT_PER_PAGE,
  refetchOnWindowFocus = false,
  ruleId,
}: Props): UseGetScheduleExecutionLogs => {
  const { addError } = useAppToasts();
  const abortController = useRef(new AbortController());

  const queryFn = useCallback(async () => {
    const response = await http.get<IExecutionLogResult>(
      `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(ruleId)}/_execution_log`,
      {
        query: {
          date_end: getParsedDate(dateEnd),
          date_start: getParsedDate(dateStart),
          page: 1,
          per_page: perPage,
          sort: JSON.stringify([{ timestamp: { order: 'desc' } }]),
        },
        signal: abortController.current.signal,
      }
    );

    return response.data;
  }, [dateEnd, dateStart, http, perPage, ruleId]);

  const { data, error, isLoading, refetch, status } = useQuery(
    [
      'GET',
      INTERNAL_BASE_ALERTING_API_PATH,
      ruleId,
      dateEnd,
      dateStart,
      isAssistantEnabled,
      perPage,
    ],
    queryFn,
    {
      enabled: isAssistantEnabled,
      onError: (e: ServerError) => {
        addError(e.body && e.body.message ? new Error(e.body.message) : e, {
          title: i18n.ERROR_RETRIEVING_SCHEDULE_EXECUTION_LOGS,
        });
      },
      refetchOnWindowFocus,
    }
  );

  return {
    data,
    error,
    isLoading,
    refetch,
    status,
  };
};
