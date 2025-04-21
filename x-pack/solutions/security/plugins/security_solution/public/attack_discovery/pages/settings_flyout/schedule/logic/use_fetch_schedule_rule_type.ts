/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase, mapKeys } from 'lodash';
import { useQuery } from '@tanstack/react-query';
import type { RuleType } from '@kbn/triggers-actions-ui-types';

import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { ALERTING_RULE_TYPES_URL, fetchRuleTypes } from '../api';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

export const useFetchScheduleRuleType = () => {
  const { addError } = useAppToasts();

  return useQuery(
    ['GET', ALERTING_RULE_TYPES_URL],
    async ({ signal }) => {
      const res = await fetchRuleTypes({ signal });

      const response = res.map((item) => {
        return mapKeys(item, (_, k) => camelCase(k));
      }) as unknown as Array<RuleType<string, string>>;

      return response.find((item) => item.id === ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID) ?? null;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.FETCH_ATTACK_DISCOVERY_SCHEDULE_RULE_TYPE_FAILURE });
      },
    }
  );
};
