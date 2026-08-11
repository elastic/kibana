/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { renderHook } from '@testing-library/react';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import {
  ENTRY_LEADER_NAME,
  ENTRY_LEADER_START,
  ENTRY_LEADER_USER_ID,
  ENTRY_LEADER_USER_NAME,
  GROUP_LEADER_WORKING_DIRECTORY,
  PROCESS_COMMAND_LINE,
} from '../constants/field_names';
import { getUserDisplayName, useProcessData } from './use_process_data';

const createHit = (flattened: Record<string, unknown>): DataTableRecord =>
  ({
    id: 'test-id',
    raw: {
      _id: 'test-id',
      _index: 'test-index',
    } as EsHitRecord,
    flattened,
  } as DataTableRecord);

describe('getUserDisplayName', () => {
  it('should return userName', () => {
    const hit = createHit({
      [ENTRY_LEADER_USER_NAME]: ['userName'],
    });
    expect(getUserDisplayName(hit)).toEqual('userName');
  });

  it('should return unknown', () => {
    const hit = createHit({});
    expect(getUserDisplayName(hit)).toEqual('unknown');
  });

  it('should return root', () => {
    const hit = createHit({
      [ENTRY_LEADER_USER_ID]: ['0'],
    });
    expect(getUserDisplayName(hit)).toEqual('root');
  });

  it('should return uid+userId', () => {
    const hit = createHit({
      [ENTRY_LEADER_USER_ID]: ['userId'],
    });
    expect(getUserDisplayName(hit)).toEqual('uid: userId');
  });
});

describe('useProcessData', () => {
  it('should return values for session preview component', () => {
    const hit = createHit({
      [ENTRY_LEADER_USER_NAME]: ['test'],
      [ENTRY_LEADER_NAME]: ['test'],
      [ENTRY_LEADER_START]: ['test'],
      [ALERT_RULE_NAME]: ['test'],
      [ALERT_RULE_UUID]: ['test'],
      [GROUP_LEADER_WORKING_DIRECTORY]: ['test'],
      [PROCESS_COMMAND_LINE]: ['test'],
    });
    const hookResult = renderHook(() => useProcessData(hit));

    expect(hookResult.result.current).toEqual({
      command: 'test',
      processName: 'test',
      ruleName: 'test',
      ruleId: 'test',
      startAt: 'test',
      userName: 'test',
      workdir: 'test',
    });
  });
});
