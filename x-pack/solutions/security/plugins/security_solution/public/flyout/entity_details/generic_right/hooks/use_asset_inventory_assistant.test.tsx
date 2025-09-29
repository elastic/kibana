/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type {
  UseAssetInventoryAssistantParams,
  UseAssetInventoryAssistantResult,
} from './use_asset_inventory_assistant';
import { useAssetInventoryAssistant } from './use_asset_inventory_assistant';
import { useAssistantContext, useAssistantOverlay } from '@kbn/elastic-assistant';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';

jest.mock('../../../../assistant/use_assistant_availability');
jest.mock('@kbn/elastic-assistant');

const mockEntityFields: Record<string, string[]> = {
  'host.name': ['test-host'],
  'host.ip': ['192.168.1.1'],
  'host.os.name': ['Ubuntu'],
  'user.name': ['test-user'],
  'process.name': ['nginx'],
};

const entityId = 'test-entity-id';

const renderUseAssetInventoryAssistant = () =>
  renderHook((props: UseAssetInventoryAssistantParams) => useAssetInventoryAssistant(props), {
    initialProps: { entityId, entityFields: mockEntityFields, isPreviewMode: false },
  });

const useAssistantOverlayMock = useAssistantOverlay as jest.Mock;

describe('useAssetInventoryAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
    });
    useAssistantOverlayMock.mockReturnValue({
      showAssistantOverlay: jest.fn(),
      promptContextId: 'asset-inventory-123',
    });

    (useAssistantContext as jest.Mock).mockReturnValue({
      basePromptContexts: [
        {
          category: 'alert',
          description: 'Alert (from view)',
          suggestedUserPrompt: 'ALERT EVALUATION',
          tooltip: 'Add this alert as context',
        },
        {
          category: 'asset',
          description: 'Asset (from inventory)',
          suggestedUserPrompt: 'ASSET ANALYSIS',
          tooltip: 'Add this asset as context',
        },
        {
          category: 'event',
          description: 'Event (from view)',
          suggestedUserPrompt: 'EVENT EVALUATION',
          tooltip: 'Add this event as context',
        },
      ],
    });
  });

  let hookResult: RenderHookResult<
    UseAssetInventoryAssistantResult,
    UseAssetInventoryAssistantParams
  >;

  it('should return showAssistant true and a value for promptContextId', () => {
    hookResult = renderUseAssetInventoryAssistant();
    expect(hookResult.result.current.showAssistant).toEqual(true);
    expect(hookResult.result.current.promptContextId).toEqual('asset-inventory-123');
  });

  it('should return showAssistant false if isAssistantEnabled is false', () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: false,
      isAssistantVisible: true,
    });

    hookResult = renderUseAssetInventoryAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(false);
  });

  it('should return showAssistant false if hasAssistantPrivilege is false', () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: false,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
    });

    hookResult = renderUseAssetInventoryAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(false);
    expect(hookResult.result.current.promptContextId).toEqual('');
  });

  it('should return showAssistant false if isAssistantVisible is false', () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: true,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
      isAssistantVisible: false,
    });

    hookResult = renderUseAssetInventoryAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(false);
  });

  it('should return showAssistant false if promptContextId is null', () => {
    useAssistantOverlayMock.mockReturnValue({
      showAssistantOverlay: jest.fn(),
      promptContextId: null,
    });

    hookResult = renderUseAssetInventoryAssistant();

    expect(hookResult.result.current.showAssistant).toEqual(false);
  });

  it('should return showAssistant false when isPreviewMode is true', () => {
    const hookResultWithPreviewMode = renderHook(
      (props: UseAssetInventoryAssistantParams) => useAssetInventoryAssistant(props),
      {
        initialProps: { entityId, entityFields: mockEntityFields, isPreviewMode: true },
      }
    );

    expect(hookResultWithPreviewMode.result.current.showAssistant).toEqual(false);
  });

  it('returns entity fields as prompt context data', async () => {
    hookResult = renderUseAssetInventoryAssistant();

    const getPromptContext = (useAssistantOverlay as jest.Mock).mock.calls[0][3];

    expect(await getPromptContext()).toEqual(mockEntityFields);
  });

  it('returns correct prompt context parameters for asset category', () => {
    renderUseAssetInventoryAssistant();

    expect(useAssistantOverlayMock.mock.calls[0][0]).toEqual('entity');
    expect(useAssistantOverlayMock.mock.calls[0][1]).toEqual('test-entity-id');
    expect(useAssistantOverlayMock.mock.calls[0][5]).toEqual('ASSET ANALYSIS');
  });

  it('falls back to default conversation ID when entityId is not provided', () => {
    renderHook((props: UseAssetInventoryAssistantParams) => useAssetInventoryAssistant(props), {
      initialProps: { entityId: '', entityFields: mockEntityFields, isPreviewMode: false },
    });

    expect(useAssistantOverlayMock.mock.calls[0][1]).toEqual('Entity Summary');
  });

  it('returns empty prompt context when entityFields is empty', async () => {
    renderHook((props: UseAssetInventoryAssistantParams) => useAssetInventoryAssistant(props), {
      initialProps: { entityId, entityFields: {}, isPreviewMode: false },
    });

    const getPromptContext = (useAssistantOverlay as jest.Mock).mock.calls[0][3];

    expect(await getPromptContext()).toEqual({});
  });

  it('uses noop function when hasAssistantPrivilege is false', () => {
    jest.mocked(useAssistantAvailability).mockReturnValue({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: false,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
    });

    const result = renderUseAssetInventoryAssistant();

    expect(result.result.current.promptContextId).toEqual('');
    expect(result.result.current.showAssistant).toEqual(false);
  });
});
