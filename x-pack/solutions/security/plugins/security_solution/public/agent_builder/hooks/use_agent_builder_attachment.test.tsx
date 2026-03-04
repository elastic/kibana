/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../common/mock';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { useAgentBuilderAttachment } from './use_agent_builder_attachment';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { THREAT_HUNTING_AGENT_ID } from '../../../common/constants';

const mockChatRef = {
  close: jest.fn(),
};

const mockOpenAgentBuilderChat = jest.fn<
  unknown,
  Parameters<AgentBuilderPluginStart['openAgentBuilderChat']>
>(() => ({
  chatRef: mockChatRef,
}));

const createWrapper = (agentBuilderService?: AgentBuilderPluginStart) => {
  const mockStartServices = createStartServicesMock();
  const startServices = {
    ...mockStartServices,
    agentBuilder: agentBuilderService ?? undefined,
  };

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <TestProviders startServices={startServices}>{children}</TestProviders>
  );
};

const mockAgentBuilderService = agentBuilderMocks.createStart();
mockAgentBuilderService.openAgentBuilderChat =
  mockOpenAgentBuilderChat as unknown as (typeof mockAgentBuilderService)['openAgentBuilderChat'];

describe('useAgentBuilderAttachment', () => {
  const defaultParams = {
    attachmentType: 'alert',
    attachmentData: { alert: 'test alert data' },
    attachmentPrompt: 'Analyze this alert',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns openAgentBuilderFlyout function', () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(mockAgentBuilderService),
    });

    expect(result.current.openAgentBuilderFlyout).toBeDefined();
    expect(typeof result.current.openAgentBuilderFlyout).toBe('function');
  });

  it('opens flyout with correct attachment data and prompt', () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(mockAgentBuilderService),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    expect(mockOpenAgentBuilderChat).toHaveBeenCalledTimes(1);
    expect(mockOpenAgentBuilderChat).toHaveBeenCalledWith({
      newConversation: true,
      autoSendInitialMessage: false,
      initialMessage: 'Analyze this alert',
      attachments: [
        {
          id: 'alert-1234567890',
          type: 'alert',
          data: { alert: 'test alert data' },
        },
      ],
      sessionTag: 'security',
      agentId: THREAT_HUNTING_AGENT_ID,
    });
  });

  it('opens flyout with correct sessionTag', () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(mockAgentBuilderService),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    expect(mockOpenAgentBuilderChat).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionTag: 'security',
      })
    );
  });

  it('handles missing agentBuilder service gracefully', () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    expect(mockOpenAgentBuilderChat).not.toHaveBeenCalled();
  });

  it('handles missing openAgentBuilderChat method gracefully', () => {
    const partialAgentBuilderService: Partial<AgentBuilderPluginStart> &
      Pick<
        AgentBuilderPluginStart,
        'tools' | 'setAgentBuilderChatConfig' | 'clearAgentBuilderChatConfig'
      > = {
      ...mockAgentBuilderService,
      openAgentBuilderChat: undefined,
    };

    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(partialAgentBuilderService as AgentBuilderPluginStart),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    expect(mockOpenAgentBuilderChat).not.toHaveBeenCalled();
  });

  it('generates attachment ID with timestamp', async () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(mockAgentBuilderService),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    const callArgs = mockOpenAgentBuilderChat.mock.calls[0][0];
    const attachment = callArgs?.attachments?.length ? callArgs?.attachments[0] : { id: '' };

    expect(attachment.id).toBe('alert-1234567890');
    expect(attachment.id).toMatch(/^alert-\d+$/);
  });
});
