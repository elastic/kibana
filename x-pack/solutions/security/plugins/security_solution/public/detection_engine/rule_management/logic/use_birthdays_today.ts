/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import type { BirthdaysTodayResponse } from '../../../../common/api/detection_engine/rule_management';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import type { BirthdaysTodayQueryArgs } from '../api/hooks/use_birthdays_today_query';
import { useBirthdaysTodayQuery } from '../api/hooks/use_birthdays_today_query';
import * as i18n from './translations';

/**
 * Wrapper around useBirthdaysTodayQuery that surfaces query errors via the
 * standard app toasts.
 */
export const useBirthdaysToday = (
  requestArgs: BirthdaysTodayQueryArgs,
  options?: UseQueryOptions<
    BirthdaysTodayResponse,
    Error,
    BirthdaysTodayResponse,
    [...string[], BirthdaysTodayQueryArgs]
  >
) => {
  const { addError } = useAppToasts();

  return useBirthdaysTodayQuery(requestArgs, {
    onError: (error: Error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
    ...options,
  });
};
