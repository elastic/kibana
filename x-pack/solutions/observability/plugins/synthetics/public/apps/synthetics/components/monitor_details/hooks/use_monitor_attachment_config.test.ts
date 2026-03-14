/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useMonitorAttachmentConfig } from './use_monitor_attachment_config';

const mockSetConversationFlyoutActiveConfig = jest.fn();
const mockClearConversationFlyoutActiveConfig = jest.fn();

const mockAgentBuilder = {
  setConversationFlyoutActiveConfig: mockSetConversationFlyoutActiveConfig,
  clearConversationFlyoutActiveConfig: mockClearConversationFlyoutActiveConfig,
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./use_selected_monitor', () => ({
  useSelectedMonitor: jest.fn(),
}));

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelectedMonitor } from './use_selected_monitor';

interface SetupMocksOptions {
  agentBuilder?: typeof mockAgentBuilder | undefined;
  monitor?: Record<string, unknown> | null;
  loading?: boolean;
}

const setupMockDefaults: Required<SetupMocksOptions> = {
  agentBuilder: mockAgentBuilder,
  monitor: {
    config_id: 'test-config-id',
    name: 'My HTTP Monitor',
    type: 'http',
  },
  loading: false,
};

const setupMocks = (overrides: SetupMocksOptions = {}) => {
  const opts = { ...setupMockDefaults, ...overrides };

  (useKibana as jest.Mock).mockReturnValue({
    services: { agentBuilder: opts.agentBuilder },
  });

  (useSelectedMonitor as jest.Mock).mockReturnValue({
    monitor: opts.monitor,
    loading: opts.loading,
  });
};

describe('useMonitorAttachmentConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not configure attachment when agentBuilder is not available', () => {
    setupMocks({ agentBuilder: undefined });

    renderHook(() => useMonitorAttachmentConfig());

    expect(mockSetConversationFlyoutActiveConfig).not.toHaveBeenCalled();
  });

  it('does not configure attachment when loading is true', () => {
    setupMocks({ loading: true });

    renderHook(() => useMonitorAttachmentConfig());

    expect(mockSetConversationFlyoutActiveConfig).not.toHaveBeenCalled();
  });

  it('does not configure attachment when monitor is null', () => {
    setupMocks({ monitor: null });

    renderHook(() => useMonitorAttachmentConfig());

    expect(mockSetConversationFlyoutActiveConfig).not.toHaveBeenCalled();
  });

  it('does not configure attachment when configId is missing', () => {
    setupMocks({ monitor: { name: 'Test', type: 'http' } });

    renderHook(() => useMonitorAttachmentConfig());

    expect(mockSetConversationFlyoutActiveConfig).not.toHaveBeenCalled();
  });

  it('configures agent builder with monitor attachment when all conditions are met', () => {
    setupMocks();

    renderHook(() => useMonitorAttachmentConfig());

    expect(mockSetConversationFlyoutActiveConfig).toHaveBeenCalledWith({
      agentId: 'observability.agent',
      attachments: [
        {
          type: 'observability.monitor',
          data: {
            attachmentLabel: 'My HTTP Monitor monitor',
            configId: 'test-config-id',
            monitorName: 'My HTTP Monitor',
            monitorType: 'http',
          },
        },
      ],
    });
  });

  it('clears agent builder config on unmount', () => {
    setupMocks();

    const { unmount } = renderHook(() => useMonitorAttachmentConfig());

    expect(mockSetConversationFlyoutActiveConfig).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockClearConversationFlyoutActiveConfig).toHaveBeenCalledTimes(1);
  });

  it('uses "unknown" when monitor type is undefined', () => {
    setupMocks({
      monitor: { config_id: 'test-id', name: 'Test Monitor' },
    });

    renderHook(() => useMonitorAttachmentConfig());

    expect(mockSetConversationFlyoutActiveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            data: expect.objectContaining({
              monitorType: 'unknown',
            }),
          }),
        ],
      })
    );
  });
});
