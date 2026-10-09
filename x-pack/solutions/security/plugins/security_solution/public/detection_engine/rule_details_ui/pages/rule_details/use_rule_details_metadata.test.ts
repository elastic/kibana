/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { RuleExecutionStatusEnum } from '../../../../../common/api/detection_engine/rule_monitoring';
import { mockRule } from '../../../rule_management_ui/components/rules_table/__mocks__/mock';
import { useRuleDetailsMetadata } from './use_rule_details_metadata';

jest.mock('../../../../common/lib/kibana', () => ({
  useDateFormat: () => 'MMM D, YYYY @ HH:mm:ss.SSS',
  useTimeZone: () => 'UTC',
}));

const lastExecution = {
  date: '2026-03-24T12:32:54.909Z',
  status: RuleExecutionStatusEnum['partial failure'],
  status_order: 20,
  message: '',
  metrics: {},
};

describe('useRuleDetailsMetadata', () => {
  it('returns no metadata while the rule is not loaded', () => {
    const { result } = renderHook(() => useRuleDetailsMetadata({ rule: null }));

    expect(result.current).toBeUndefined();
  });

  it('returns the last execution status, created by, and updated by', () => {
    const rule = {
      ...mockRule('rule-id'),
      created_at: '2024-10-10T00:11:03.176Z',
      updated_at: '2026-02-08T04:37:53.533Z',
      execution_summary: { last_execution: lastExecution },
    };

    const { result } = renderHook(() =>
      useRuleDetailsMetadata({ rule, createdBy: 'analyst', updatedBy: 'other analyst' })
    );

    expect(result.current).toEqual([
      expect.objectContaining({
        type: 'health',
        label: 'Warning at Mar 24, 2026 @ 12:32:54.909',
        color: 'warning',
      }),
      expect.objectContaining({
        type: 'text',
        label: 'Created by: analyst on Oct 10, 2024 @ 00:11:03.176',
      }),
      expect.objectContaining({
        type: 'text',
        label: 'Updated by: other analyst on Feb 8, 2026 @ 04:37:53.533',
      }),
    ]);
  });

  it('shows an empty status when the rule has not run yet', () => {
    const { result } = renderHook(() => useRuleDetailsMetadata({ rule: mockRule('rule-id') }));

    expect(result.current?.[0]).toEqual(
      expect.objectContaining({ type: 'health', label: '—', color: 'subdued' })
    );
  });
});
