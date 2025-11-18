/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAssistantOverlay } from '@kbn/elastic-assistant';
import { getAttackDiscoveryMarkdown } from '@kbn/elastic-assistant-common';

import { useAssistantAvailability } from '../../../../../assistant/use_assistant_availability';
import { mockAttackDiscovery } from '../../../mock/mock_attack_discovery';
import { useViewInAiAssistant } from './use_view_in_ai_assistant';

jest.mock('@kbn/elastic-assistant');
jest.mock('@kbn/elastic-assistant-common');
jest.mock('../../../../../assistant/use_assistant_availability');
const mockUseAssistantOverlay = useAssistantOverlay as jest.Mock;
describe('useViewInAiAssistant', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAssistantOverlay.mockReturnValue({
      promptContextId: 'prompt-context-id',
      showAssistantOverlay: jest.fn(),
    });

    (useAssistantAvailability as jest.Mock).mockReturnValue({
      hasAssistantPrivilege: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
    });

    (getAttackDiscoveryMarkdown as jest.Mock).mockResolvedValue('Test markdown');
  });

  it('returns the expected promptContextId', () => {
    const { result } = renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: mockAttackDiscovery,
      })
    );

    expect(result.current.promptContextId).toBe('prompt-context-id');
  });

  it('returns disabled: false when the user has assistant privileges and promptContextId is provided', () => {
    const { result } = renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: mockAttackDiscovery,
      })
    );

    expect(result.current.disabled).toBe(false);
  });

  it('returns disabled: true when the user does NOT have assistant privileges', () => {
    (useAssistantAvailability as jest.Mock).mockReturnValue({
      hasAssistantPrivilege: false, // <-- the user does NOT have assistant privileges
      isAssistantEnabled: true,
      isAssistantVisible: true,
    });

    const { result } = renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: mockAttackDiscovery,
      })
    );

    expect(result.current.disabled).toBe(true);
  });

  it('returns disabled: true when promptContextId is null', () => {
    (useAssistantOverlay as jest.Mock).mockReturnValue({
      promptContextId: null, // <-- promptContextId is null
      showAssistantOverlay: jest.fn(),
    });

    const { result } = renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: mockAttackDiscovery,
      })
    );

    expect(result.current.disabled).toBe(true);
  });

  it('returns disabled: true when attackDiscovery is undefined', () => {
    const { result } = renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: undefined,
      })
    );

    expect(result.current.disabled).toBe(true);
  });

  it('returns disabled: true when attackDiscovery is null', () => {
    const { result } = renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: null as unknown as typeof mockAttackDiscovery,
      })
    );

    expect(result.current.disabled).toBe(true);
  });

  it('calls showOverlay(true) when showAssistantOverlay is called', () => {
    const showOverlayMock = jest.fn();
    mockUseAssistantOverlay.mockReturnValue({
      promptContextId: 'prompt-context-id',
      showAssistantOverlay: showOverlayMock,
    });

    const { result } = renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: mockAttackDiscovery,
      })
    );

    result.current.showAssistantOverlay();

    expect(showOverlayMock).toHaveBeenCalledWith(true);
  });

  it('passes replacements to useAssistantOverlay when provided', () => {
    const replacements = { foo: 'bar' };
    renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: mockAttackDiscovery,
        replacements,
      })
    );

    expect(mockUseAssistantOverlay.mock.calls[0][8]).toEqual(replacements);
  });

  it('passes null to useAssistantOverlay for replacements when not provided', () => {
    renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: mockAttackDiscovery,
      })
    );

    expect(mockUseAssistantOverlay.mock.calls[0][8]).toBeNull();
  });

  it('uses the title + last 5 of the attack discovery id as the conversation title', () => {
    renderHook(() =>
      useViewInAiAssistant({
        attackDiscovery: mockAttackDiscovery,
      })
    );

    expect(mockUseAssistantOverlay.mock.calls[0][1]).toEqual(
      'Malware Attack With Credential Theft Attempt - b72b1'
    );
  });
});
