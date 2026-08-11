/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getAttackDiscoveryMarkdown } from '@kbn/elastic-assistant-common';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useAttackDiscoveryAttachment } from '.';
import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';

jest.mock('@kbn/elastic-assistant-common');
jest.mock('../../../../agent_builder/hooks/use_agent_builder_attachment');

const mockGetAttackDiscoveryMarkdown = getAttackDiscoveryMarkdown as jest.Mock;
const mockUseAgentBuilderAttachment = useAgentBuilderAttachment as jest.Mock;

describe('useAttackDiscoveryAttachment', () => {
  const mockOpenAgentBuilderFlyout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAttackDiscoveryMarkdown.mockReturnValue('Test markdown');
    mockUseAgentBuilderAttachment.mockReturnValue({
      openAgentBuilderFlyout: mockOpenAgentBuilderFlyout,
    });
  });

  it('returns openAgentBuilderFlyout function', () => {
    const { result } = renderHook(() => useAttackDiscoveryAttachment(mockAttackDiscovery));

    expect(typeof result.current).toBe('function');
  });

  it('returns openAgentBuilderFlyout function when attackDiscovery is undefined', () => {
    const { result } = renderHook(() => useAttackDiscoveryAttachment(undefined));

    expect(typeof result.current).toBe('function');
  });

  it('calls getAttackDiscoveryMarkdown with attackDiscovery and replacements', () => {
    const replacements = { 'host.name': 'test-host' };
    renderHook(() => useAttackDiscoveryAttachment(mockAttackDiscovery, replacements));

    expect(mockGetAttackDiscoveryMarkdown).toHaveBeenCalledWith({
      attackDiscovery: mockAttackDiscovery,
      replacements,
    });
  });

  it('calls getAttackDiscoveryMarkdown with undefined replacements when not provided', () => {
    renderHook(() => useAttackDiscoveryAttachment(mockAttackDiscovery));

    expect(mockGetAttackDiscoveryMarkdown).toHaveBeenCalledWith({
      attackDiscovery: mockAttackDiscovery,
      replacements: undefined,
    });
  });

  it('calls useAgentBuilderAttachment with empty alert when attackDiscovery is undefined', () => {
    renderHook(() => useAttackDiscoveryAttachment(undefined));

    expect(mockUseAgentBuilderAttachment).toHaveBeenCalledWith({
      attachmentType: SecurityAgentBuilderAttachments.alert,
      attachmentData: {
        alert: '',
        attachmentLabel: 'Attack discovery',
      },
      attachmentPrompt: expect.any(String),
    });
  });

  it('calls useAgentBuilderAttachment with markdown and title when attackDiscovery is provided', () => {
    renderHook(() => useAttackDiscoveryAttachment(mockAttackDiscovery));

    expect(mockUseAgentBuilderAttachment).toHaveBeenCalledWith({
      attachmentType: SecurityAgentBuilderAttachments.alert,
      attachmentData: {
        alert: 'Test markdown',
        attachmentLabel: mockAttackDiscovery.title,
      },
      attachmentPrompt: expect.any(String),
    });
  });
});
