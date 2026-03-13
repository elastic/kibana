/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useHostAttachmentConfig } from './use_host_attachment_config';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';
import { useDatePickerContext } from './use_date_picker';

jest.mock('../../../hooks/use_kibana');
jest.mock('./use_asset_details_render_props');
jest.mock('./use_date_picker');

const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;
const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;
const useDatePickerContextMock = useDatePickerContext as jest.MockedFunction<
  typeof useDatePickerContext
>;

const mockSetAgentBuilderChatConfig = jest.fn();
const mockClearAgentBuilderChatConfig = jest.fn();

const mockAgentBuilder = {
  setChatConfig: mockSetAgentBuilderChatConfig,
  clearChatConfig: mockClearAgentBuilderChatConfig,
};

const mockGetParsedDateRange = jest.fn().mockReturnValue({
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-02T00:00:00.000Z',
});

interface SetupMocksOptions {
  agentBuilder?: typeof mockAgentBuilder;
  loading?: boolean;
  entityType?: string;
  entityName?: string;
  dateRange?: { from?: string; to?: string };
}

const setupMockDefaults: Required<SetupMocksOptions> = {
  agentBuilder: mockAgentBuilder,
  loading: false,
  entityType: 'host',
  entityName: 'test-host-01',
  dateRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' },
};

const setupMocks = (overrides: SetupMocksOptions = {}) => {
  const { agentBuilder, loading, entityType, entityName, dateRange } = {
    ...setupMockDefaults,
    ...overrides,
  };
  useKibanaContextForPluginMock.mockReturnValue({
    services: { agentBuilder },
  } as unknown as ReturnType<typeof useKibanaContextForPlugin>);

  useAssetDetailsRenderPropsContextMock.mockReturnValue({
    entity: { type: entityType, name: entityName },
    loading,
  } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);

  mockGetParsedDateRange.mockReturnValue(dateRange);
  useDatePickerContextMock.mockReturnValue({
    getParsedDateRange: mockGetParsedDateRange,
  } as unknown as ReturnType<typeof useDatePickerContext>);
};

describe('useHostAttachmentConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not configure attachment when agentBuilder is not available', () => {
    setupMocks({ agentBuilder: undefined });

    renderHook(() => useHostAttachmentConfig());

    expect(mockSetAgentBuilderChatConfig).not.toHaveBeenCalled();
  });

  it('does not configure attachment when loading is true', () => {
    setupMocks({ loading: true });

    renderHook(() => useHostAttachmentConfig());

    expect(mockSetAgentBuilderChatConfig).not.toHaveBeenCalled();
  });

  it('does not configure attachment when entity type is not host', () => {
    setupMocks({ entityType: 'container' });

    renderHook(() => useHostAttachmentConfig());

    expect(mockSetAgentBuilderChatConfig).not.toHaveBeenCalled();
  });

  it('does not configure attachment when entity name is empty', () => {
    setupMocks({ entityName: '' });

    renderHook(() => useHostAttachmentConfig());

    expect(mockSetAgentBuilderChatConfig).not.toHaveBeenCalled();
  });

  it('does not configure attachment when date range is missing', () => {
    setupMocks({ dateRange: { from: undefined, to: undefined } });

    renderHook(() => useHostAttachmentConfig());

    expect(mockSetAgentBuilderChatConfig).not.toHaveBeenCalled();
  });

  it('configures agent builder with host attachment when all conditions are met', () => {
    setupMocks();

    renderHook(() => useHostAttachmentConfig());

    expect(mockSetAgentBuilderChatConfig).toHaveBeenCalledWith({
      agentId: 'observability.agent',
      attachments: [
        expect.objectContaining({
          type: 'observability.host',
          data: expect.objectContaining({
            hostName: 'test-host-01',
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-02T00:00:00.000Z',
            attachmentLabel: 'test-host-01 host',
          }),
        }),
      ],
    });
  });

  it('clears agent builder config on unmount', () => {
    setupMocks();

    const { unmount } = renderHook(() => useHostAttachmentConfig());

    unmount();

    expect(mockClearAgentBuilderChatConfig).toHaveBeenCalled();
  });
});
