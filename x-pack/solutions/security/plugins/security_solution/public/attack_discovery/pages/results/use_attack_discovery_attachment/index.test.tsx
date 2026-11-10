/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { ATTACK_DISCOVERY_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';
import { getAttackDiscoveryAttachmentData } from './get_attack_discovery_attachment_data';
import { useAttackDiscoveryAttachment } from '.';

jest.mock('../../../../agent_builder/hooks/use_agent_builder_attachment');

const mockUseAgentBuilderAttachment = useAgentBuilderAttachment as jest.Mock;

const [attackDiscovery] = getMockAttackDiscoveryAlerts();
const { replacements } = attackDiscovery;

describe('useAttackDiscoveryAttachment', () => {
  const mockOpenAgentBuilderFlyout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentBuilderAttachment.mockReturnValue({
      openAgentBuilderFlyout: mockOpenAgentBuilderFlyout,
    });
  });

  it('attaches the discovery as a security.attack_discovery', () => {
    renderHook(() => useAttackDiscoveryAttachment(attackDiscovery, replacements));

    expect(mockUseAgentBuilderAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentType: SecurityAgentBuilderAttachments.attackDiscovery,
      })
    );
  });

  it('sends the de-anonymized attachment data by value', () => {
    renderHook(() => useAttackDiscoveryAttachment(attackDiscovery, replacements));

    expect(mockUseAgentBuilderAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentData: getAttackDiscoveryAttachmentData({ attackDiscovery, replacements }),
      })
    );
  });

  it('describes the attachment with the de-anonymized title', () => {
    const anonymizedHost = '3d241119-f77a-454e-8ee3-d36e05a8714f';

    renderHook(() =>
      useAttackDiscoveryAttachment(
        { ...attackDiscovery, title: `Attack on ${anonymizedHost}` },
        { [anonymizedHost]: 'SRVMAC08' }
      )
    );

    expect(mockUseAgentBuilderAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentDescription: 'Attack on SRVMAC08' })
    );
  });

  // By value only: `data.id` already carries the persisted discovery id.
  it('does not set an origin', () => {
    renderHook(() => useAttackDiscoveryAttachment(attackDiscovery, replacements));

    expect(mockUseAgentBuilderAttachment).toHaveBeenCalledWith(
      expect.not.objectContaining({ origin: expect.anything() })
    );
  });

  it('uses the attack discovery prompt', () => {
    renderHook(() => useAttackDiscoveryAttachment(attackDiscovery, replacements));

    expect(mockUseAgentBuilderAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentPrompt: ATTACK_DISCOVERY_ATTACHMENT_PROMPT })
    );
  });

  it('returns the openAgentBuilderFlyout function when a discovery is provided', () => {
    const { result } = renderHook(() =>
      useAttackDiscoveryAttachment(attackDiscovery, replacements)
    );

    expect(result.current).toBe(mockOpenAgentBuilderFlyout);
  });

  it('returns a no-op instead of opening Agent Builder when the discovery is undefined', () => {
    const { result } = renderHook(() => useAttackDiscoveryAttachment(undefined));

    result.current();

    expect(mockOpenAgentBuilderFlyout).not.toHaveBeenCalled();
  });
});
