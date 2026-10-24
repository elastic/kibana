/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import moment from 'moment-timezone';
import type { AppHeaderMetadataItem, AppHeaderMetadataItems } from '@kbn/app-header';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { useDateFormat, useTimeZone } from '../../../../common/lib/kibana';
import {
  getCapitalizedStatusText,
  getStatusColor,
} from '../../../common/components/rule_execution_status/utils';
import type { Rule } from '../../../rule_management/logic';
import * as i18n from './translations';

interface UseRuleDetailsMetadataProps {
  rule: Rule | null;
  createdBy?: string;
  updatedBy?: string;
}

/** Builds the rule details header metadata row: last execution status, created by, and updated by. */
export const useRuleDetailsMetadata = ({
  rule,
  createdBy,
  updatedBy,
}: UseRuleDetailsMetadataProps): AppHeaderMetadataItems | undefined => {
  const dateFormat = useDateFormat();
  const timeZone = useTimeZone();

  return useMemo(() => {
    if (!rule) return undefined;

    const formatDate = (date: string) => moment.tz(date, timeZone).format(dateFormat);
    const lastExecution = rule.execution_summary?.last_execution;
    const statusText = getCapitalizedStatusText(lastExecution?.status);

    const statusItem: AppHeaderMetadataItem = {
      type: 'health',
      label:
        statusText && lastExecution
          ? i18n.STATUS_AT(statusText, formatDate(lastExecution.date))
          : getEmptyValue(),
      color: getStatusColor(lastExecution?.status),
      'data-test-subj': 'ruleStatus',
    };
    const createdByItem: AppHeaderMetadataItem = {
      type: 'text',
      label: i18n.CREATED_BY_ON(createdBy ?? i18n.UNKNOWN, formatDate(rule.created_at)),
      'data-test-subj': 'ruleDetailsCreatedBy',
    };
    const updatedByItem: AppHeaderMetadataItem | undefined =
      rule.updated_by != null
        ? {
            type: 'text',
            label: i18n.UPDATED_BY_ON(updatedBy ?? i18n.UNKNOWN, formatDate(rule.updated_at)),
            'data-test-subj': 'ruleDetailsUpdatedBy',
          }
        : undefined;

    return [statusItem, createdByItem, updatedByItem];
  }, [rule, createdBy, updatedBy, dateFormat, timeZone]);
};
