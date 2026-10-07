/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import {
  ENTRY_LEADER_NAME,
  ENTRY_LEADER_START,
  ENTRY_LEADER_USER_ID,
  ENTRY_LEADER_USER_NAME,
  GROUP_LEADER_WORKING_DIRECTORY,
  PROCESS_COMMAND_LINE,
} from '../constants/field_names';

/**
 * Returns user name with some fallback logic in case it is not available. The idea was borrowed from session viewer
 */
export const getUserDisplayName = (hit: DataTableRecord): string => {
  const userName = getFieldValue(hit, ENTRY_LEADER_USER_NAME) as string;
  const userId = getFieldValue(hit, ENTRY_LEADER_USER_ID) as string;

  if (userName) {
    return userName;
  }

  if (!userId) {
    return 'unknown';
  }

  return userId === '0' ? 'root' : `uid: ${userId}`;
};

/**
 * Returns memoized process-related values for the session preview component
 */
export const useProcessData = (hit: DataTableRecord) => {
  return useMemo(
    () => ({
      userName: getUserDisplayName(hit),
      processName: getFieldValue(hit, ENTRY_LEADER_NAME) as string,
      startAt: getFieldValue(hit, ENTRY_LEADER_START) as string,
      ruleName: getFieldValue(hit, ALERT_RULE_NAME) as string,
      ruleId: getFieldValue(hit, ALERT_RULE_UUID) as string,
      workdir: getFieldValue(hit, GROUP_LEADER_WORKING_DIRECTORY) as string,
      command: getFieldValue(hit, PROCESS_COMMAND_LINE) as string,
    }),
    [hit]
  );
};
