/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChatEventType } from '@kbn/agent-builder-common';
import { useOnMigrationRuleUpdatedToolEvent } from './use_on_migration_rule_updated_tool_event';
import { SIEM_MIGRATION_RULE_UPDATED_TOOL_EVENT } from '../../../../common/siem_migrations/tool_events';

jest.mock('../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));

const { useKibana } = jest.requireMock('../../../common/lib/kibana');

const makeToolUiEvent = (customEvent: string, data: object) => ({
  type: ChatEventType.toolUi,
  data: {
    tool_id: 'test-tool',
    tool_call_id: 'call-1',
    custom_event: customEvent,
    data,
  },
});

describe('useOnMigrationRuleUpdatedToolEvent', () => {
  let chatEvents$: Subject<unknown>;
  let activeConversation$: BehaviorSubject<{ id: string } | null>;

  beforeEach(() => {
    chatEvents$ = new Subject();
    activeConversation$ = new BehaviorSubject<{ id: string } | null>({ id: 'conv-1' });

    useKibana.mockReturnValue({
      services: {
        agentBuilder: {
          events: {
            ui: { activeConversation$ },
            getChatEvents$: jest.fn().mockReturnValue(chatEvents$),
          },
        },
      },
    });
  });

  it('calls callback when the matching event fires', () => {
    const callback = jest.fn();
    renderHook(() => useOnMigrationRuleUpdatedToolEvent(callback));

    act(() => {
      chatEvents$.next(
        makeToolUiEvent(SIEM_MIGRATION_RULE_UPDATED_TOOL_EVENT, {
          migrationId: 'm-1',
          ruleId: 'r-1',
        })
      );
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ migrationId: 'm-1', ruleId: 'r-1' });
  });

  it('ignores events with a different custom event name', () => {
    const callback = jest.fn();
    renderHook(() => useOnMigrationRuleUpdatedToolEvent(callback));

    act(() => {
      chatEvents$.next(makeToolUiEvent('some_other_event', { migrationId: 'm-1', ruleId: 'r-1' }));
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores non-tool-ui events', () => {
    const callback = jest.fn();
    renderHook(() => useOnMigrationRuleUpdatedToolEvent(callback));

    act(() => {
      chatEvents$.next({ type: 'round_complete', data: {} });
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => useOnMigrationRuleUpdatedToolEvent(callback));

    unmount();

    act(() => {
      chatEvents$.next(
        makeToolUiEvent(SIEM_MIGRATION_RULE_UPDATED_TOOL_EVENT, {
          migrationId: 'm-1',
          ruleId: 'r-1',
        })
      );
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not resubscribe when only the callback identity changes', () => {
    const getChatEvents$ = jest.fn().mockReturnValue(chatEvents$);
    useKibana.mockReturnValue({
      services: {
        agentBuilder: {
          events: {
            ui: { activeConversation$ },
            getChatEvents$,
          },
        },
      },
    });

    const { rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useOnMigrationRuleUpdatedToolEvent(cb),
      { initialProps: { cb: jest.fn() } }
    );
    rerender({ cb: jest.fn() });
    rerender({ cb: jest.fn() });

    // getChatEvents$ is called once on mount (when activeConversation$ emits), not on every rerender
    expect(getChatEvents$).toHaveBeenCalledTimes(1);
  });

  it('does nothing when agentBuilder is not available', () => {
    useKibana.mockReturnValue({ services: { agentBuilder: undefined } });

    const callback = jest.fn();
    expect(() => renderHook(() => useOnMigrationRuleUpdatedToolEvent(callback))).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });
});
