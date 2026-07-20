/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type {
  RuleHistoryItem,
  RestoreRuleFromHistoryResponse,
} from '../../../../../common/api/detection_engine/rule_management';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { useRuleRestoreFromHistory } from './use_rule_restore_from_history';
import { useRestoreRuleFromHistoryMutation } from '../../../rule_management/api/hooks/use_restore_rule_revision_mutation';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { RuleChangesHistoryEventTypes } from '../../../../common/lib/telemetry/events/rule_changes_history/types';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';

jest.mock('../../../rule_management/api/hooks/use_restore_rule_revision_mutation');
jest.mock('../../../../common/hooks/use_app_toasts');

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const useAppToastsValueMock = useAppToastsMock.create();

const MOCK_PREBUILT_RULE = {
  type: 'query',
  rule_source: { type: 'external', is_customized: false },
} as RuleResponse;
const MOCK_CUSTOMIZED_PREBUILT_RULE = {
  type: 'eql',
  rule_source: { type: 'external', is_customized: true },
} as RuleResponse;
const MOCK_CUSTOM_RULE = { type: 'query', rule_source: { type: 'internal' } } as RuleResponse;

const createHistoryItem = (rule: RuleResponse): RuleHistoryItem =>
  ({
    id: 'item-1',
    timestamp: new Date().toISOString(),
    action: 'rule_update',
    rule,
    old_values: null,
  } as RuleHistoryItem);

const createConflictError = () =>
  Object.assign(new Error('conflict'), {
    response: { status: 409 },
    body: { attributes: { revision: 3 } },
  });

const createGenericError = () => new Error('boom');

describe('useRuleRestoreFromHistory', () => {
  let capturedOnSettled: (
    response: RestoreRuleFromHistoryResponse | undefined,
    error: Error | undefined
  ) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppToasts as jest.Mock).mockReturnValue(useAppToastsValueMock);
    (useRestoreRuleFromHistoryMutation as jest.Mock).mockImplementation(({ onSettled }) => {
      capturedOnSettled = onSettled;
      return { mutate: jest.fn() };
    });
  });

  describe('telemetry', () => {
    it('reports status "no_change" when the restore results in no changes', () => {
      const item = createHistoryItem(MOCK_CUSTOM_RULE);
      const { result } = renderHook(() =>
        useRuleRestoreFromHistory({ ruleId: 'rule-1', ruleRevision: 1 })
      );

      act(() => {
        result.current.restoreFromHistory(item);
      });

      act(() => {
        capturedOnSettled(
          { no_change: true } as unknown as RestoreRuleFromHistoryResponse,
          undefined
        );
      });

      expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
        RuleChangesHistoryEventTypes.ChangesHistoryRestoreTriggered,
        {
          status: 'no_change',
          ruleType: 'query',
          isPrebuilt: false,
          isCustomized: false,
          isConflictRetry: false,
        }
      );
    });

    it('reports status "success" with isPrebuilt true, isCustomized false for a non-customized prebuilt rule restore', () => {
      const item = createHistoryItem(MOCK_PREBUILT_RULE);
      const { result } = renderHook(() =>
        useRuleRestoreFromHistory({ ruleId: 'rule-1', ruleRevision: 1 })
      );

      act(() => {
        result.current.restoreFromHistory(item);
      });

      act(() => {
        capturedOnSettled(
          { rule: MOCK_PREBUILT_RULE } as unknown as RestoreRuleFromHistoryResponse,
          undefined
        );
      });

      expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
        RuleChangesHistoryEventTypes.ChangesHistoryRestoreTriggered,
        {
          status: 'success',
          ruleType: 'query',
          isPrebuilt: true,
          isCustomized: false,
          isConflictRetry: false,
        }
      );
    });

    it('reports status "success" with isPrebuilt true, isCustomized true for a customized prebuilt rule restore', () => {
      const item = createHistoryItem(MOCK_CUSTOMIZED_PREBUILT_RULE);
      const { result } = renderHook(() =>
        useRuleRestoreFromHistory({ ruleId: 'rule-1', ruleRevision: 1 })
      );

      act(() => {
        result.current.restoreFromHistory(item);
      });

      act(() => {
        capturedOnSettled(
          { rule: MOCK_CUSTOMIZED_PREBUILT_RULE } as unknown as RestoreRuleFromHistoryResponse,
          undefined
        );
      });

      expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
        RuleChangesHistoryEventTypes.ChangesHistoryRestoreTriggered,
        {
          status: 'success',
          ruleType: 'eql',
          isPrebuilt: true,
          isCustomized: true,
          isConflictRetry: false,
        }
      );
    });

    it('reports status "conflict" with isConflictRetry false on the first conflicting attempt', () => {
      const item = createHistoryItem(MOCK_CUSTOM_RULE);
      const onConflict = jest.fn();
      const { result } = renderHook(() =>
        useRuleRestoreFromHistory({ ruleId: 'rule-1', ruleRevision: 1, onConflict })
      );

      act(() => {
        result.current.restoreFromHistory(item);
      });

      act(() => {
        capturedOnSettled(undefined, createConflictError());
      });

      expect(onConflict).toHaveBeenCalledTimes(1);
      expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
        RuleChangesHistoryEventTypes.ChangesHistoryRestoreTriggered,
        {
          status: 'conflict',
          ruleType: 'query',
          isPrebuilt: false,
          isCustomized: false,
          isConflictRetry: false,
        }
      );
    });

    it('reports status "conflict" with isConflictRetry true on a restore-anyway retry', () => {
      const item = createHistoryItem(MOCK_CUSTOM_RULE);
      const onConflict = jest.fn();
      const { result } = renderHook(() =>
        useRuleRestoreFromHistory({ ruleId: 'rule-1', ruleRevision: 1, onConflict })
      );

      act(() => {
        result.current.restoreFromHistory(item);
      });

      act(() => {
        capturedOnSettled(undefined, createConflictError());
      });

      const restoreAnyway = onConflict.mock.calls[0][1] as () => void;

      act(() => {
        restoreAnyway();
      });

      mockedTelemetry.reportEvent.mockClear();

      act(() => {
        capturedOnSettled(undefined, createConflictError());
      });

      expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
        RuleChangesHistoryEventTypes.ChangesHistoryRestoreTriggered,
        {
          status: 'conflict',
          ruleType: 'query',
          isPrebuilt: false,
          isCustomized: false,
          isConflictRetry: true,
        }
      );
    });

    it('reports status "error" for a non-conflict error', () => {
      const item = createHistoryItem(MOCK_CUSTOM_RULE);
      const { result } = renderHook(() =>
        useRuleRestoreFromHistory({ ruleId: 'rule-1', ruleRevision: 1 })
      );

      act(() => {
        result.current.restoreFromHistory(item);
      });

      act(() => {
        capturedOnSettled(undefined, createGenericError());
      });

      expect(mockedTelemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockedTelemetry.reportEvent).toHaveBeenCalledWith(
        RuleChangesHistoryEventTypes.ChangesHistoryRestoreTriggered,
        {
          status: 'error',
          ruleType: 'query',
          isPrebuilt: false,
          isCustomized: false,
          isConflictRetry: false,
        }
      );
    });
  });
});
