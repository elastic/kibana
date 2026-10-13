/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { ActiveConversation, AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import { useKibana } from '../../common/lib/kibana';
import { useOnResolutionGroupUpdatedToolEvent } from './use_on_resolution_group_updated_tool_event';
import { RESOLUTION_GROUP_UPDATED_TOOL_EVENT } from '../../../common/entity_analytics/tool_events';

jest.mock('../../common/lib/kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const toolUiEvent = (customEvent: string): ChatEvent =>
  ({
    type: ChatEventType.toolUi,
    data: {
      tool_id: 'security.link_entities',
      tool_call_id: 'call-1',
      custom_event: customEvent,
      data: {},
    },
  } as unknown as ChatEvent);

describe('useOnResolutionGroupUpdatedToolEvent', () => {
  const makeAgentBuilder = () => {
    const activeConversation$ = new Subject<ActiveConversation | null>();
    const chatEventsByConversation = new Map<string, Subject<ChatEvent>>();

    const getChatEvents$ = jest.fn((conversationId: string) => {
      let subject = chatEventsByConversation.get(conversationId);
      if (!subject) {
        subject = new Subject<ChatEvent>();
        chatEventsByConversation.set(conversationId, subject);
      }
      return subject.asObservable();
    });

    const agentBuilder = {
      events: {
        ui: { activeConversation$: activeConversation$.asObservable() },
        getChatEvents$,
      },
    } as unknown as AgentBuilderPluginStart;

    return { agentBuilder, activeConversation$, chatEventsByConversation };
  };

  beforeEach(() => {
    mockUseKibana.mockReset();
  });

  it('does not throw and never calls back when agentBuilder is unavailable', () => {
    mockUseKibana.mockReturnValue({ services: {} });
    const callback = jest.fn();

    expect(() => renderHook(() => useOnResolutionGroupUpdatedToolEvent(callback))).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('invokes the callback when the resolution-group tool event fires in the active conversation', () => {
    const { agentBuilder, activeConversation$, chatEventsByConversation } = makeAgentBuilder();
    mockUseKibana.mockReturnValue({ services: { agentBuilder } });
    const callback = jest.fn();

    renderHook(() => useOnResolutionGroupUpdatedToolEvent(callback));

    activeConversation$.next({ id: 'conv-1' });
    chatEventsByConversation.get('conv-1')!.next(toolUiEvent(RESOLUTION_GROUP_UPDATED_TOOL_EVENT));

    expect(callback).toHaveBeenCalledWith();
  });

  it('ignores unrelated custom tool-ui events', () => {
    const { agentBuilder, activeConversation$, chatEventsByConversation } = makeAgentBuilder();
    mockUseKibana.mockReturnValue({ services: { agentBuilder } });
    const callback = jest.fn();

    renderHook(() => useOnResolutionGroupUpdatedToolEvent(callback));

    activeConversation$.next({ id: 'conv-1' });
    chatEventsByConversation.get('conv-1')!.next(toolUiEvent('some_other_event'));

    expect(callback).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { agentBuilder, activeConversation$, chatEventsByConversation } = makeAgentBuilder();
    mockUseKibana.mockReturnValue({ services: { agentBuilder } });
    const callback = jest.fn();

    const { unmount } = renderHook(() => useOnResolutionGroupUpdatedToolEvent(callback));

    activeConversation$.next({ id: 'conv-1' });
    unmount();
    chatEventsByConversation.get('conv-1')!.next(toolUiEvent(RESOLUTION_GROUP_UPDATED_TOOL_EVENT));

    expect(callback).not.toHaveBeenCalled();
  });
});
