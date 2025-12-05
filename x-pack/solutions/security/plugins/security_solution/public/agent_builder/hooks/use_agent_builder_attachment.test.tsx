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
import type { OnechatPluginStart } from '@kbn/onechat-plugin/public';

const mockFlyoutRef = {
  close: jest.fn(),
};

const mockOpenConversationFlyout = jest.fn<
  unknown,
  Parameters<OnechatPluginStart['openConversationFlyout']>
>(() => ({
  flyoutRef: mockFlyoutRef,
}));

const createWrapper = (onechatService?: OnechatPluginStart) => {
  const mockStartServices = createStartServicesMock();
  const startServices = {
    ...mockStartServices,
    onechat: onechatService ?? undefined,
  };

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <TestProviders startServices={startServices}>{children}</TestProviders>
  );
};

const mockOnechatService: OnechatPluginStart = {
  openConversationFlyout:
    mockOpenConversationFlyout as OnechatPluginStart['openConversationFlyout'],
  tools: {} as OnechatPluginStart['tools'],
  attachments: {} as OnechatPluginStart['attachments'],
  setConversationFlyoutActiveConfig: jest.fn(),
  clearConversationFlyoutActiveConfig: jest.fn(),
};

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
      wrapper: createWrapper(mockOnechatService),
    });

    expect(result.current.openAgentBuilderFlyout).toBeDefined();
    expect(typeof result.current.openAgentBuilderFlyout).toBe('function');
  });

  it('opens flyout with correct attachment data and prompt', () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(mockOnechatService),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    expect(mockOpenConversationFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenConversationFlyout).toHaveBeenCalledWith({
      newConversation: true,
      initialMessage: 'Analyze this alert',
      attachments: [
        {
          id: 'alert-1234567890',
          type: 'alert',
          data: { alert: 'test alert data' },
        },
      ],
      sessionTag: 'security',
    });
  });

  it('opens flyout with correct sessionTag', () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(mockOnechatService),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    expect(mockOpenConversationFlyout).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionTag: 'security',
      })
    );
  });

  it('handles missing onechat service gracefully', () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    expect(mockOpenConversationFlyout).not.toHaveBeenCalled();
  });

  it('handles missing openConversationFlyout method gracefully', () => {
    const partialOnechatService: Partial<OnechatPluginStart> &
      Pick<
        OnechatPluginStart,
        'tools' | 'setConversationFlyoutActiveConfig' | 'clearConversationFlyoutActiveConfig'
      > = {
      ...mockOnechatService,
      openConversationFlyout: undefined,
    };

    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(partialOnechatService as OnechatPluginStart),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    expect(mockOpenConversationFlyout).not.toHaveBeenCalled();
  });

  it('generates attachment ID with timestamp', async () => {
    const { result } = renderHook(() => useAgentBuilderAttachment(defaultParams), {
      wrapper: createWrapper(mockOnechatService),
    });

    act(() => {
      result.current.openAgentBuilderFlyout();
    });

    const callArgs = mockOpenConversationFlyout.mock.calls[0][0];
    const attachment = callArgs?.attachments?.length ? callArgs?.attachments[0] : { id: '' };

    expect(attachment.id).toBe('alert-1234567890');
    expect(attachment.id).toMatch(/^alert-\d+$/);
  });
});
