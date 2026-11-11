/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useKibana } from '../../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useLicense } from '../../../common/hooks/use_license';
import { useAgentBuilderAvailability } from '../../../agent_builder/hooks/use_agent_builder_availability';
import { useLeadGenerationPrivileges } from '../../api/hooks/use_lead_generation_privileges';
import { useHuntWithAiAvailability } from './use_hunt_with_ai_availability';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../common/hooks/use_license');
jest.mock('../../../agent_builder/hooks/use_agent_builder_availability');
jest.mock('../../api/hooks/use_lead_generation_privileges');

const mockUseKibana = useKibana as jest.Mock;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockUseLicense = useLicense as jest.Mock;
const mockUseAgentBuilderAvailability = useAgentBuilderAvailability as jest.Mock;
const mockUseLeadGenerationPrivileges = useLeadGenerationPrivileges as jest.Mock;

const setup = ({
  agentChat = true,
  agentBuilder = true,
  leadGeneration = true,
  enterprise = true,
  canReadLeads = true,
}: {
  agentChat?: boolean;
  agentBuilder?: boolean;
  leadGeneration?: boolean;
  enterprise?: boolean;
  canReadLeads?: boolean;
} = {}) => {
  mockUseKibana.mockReturnValue({
    services: { agentBuilder: agentBuilder ? { openChat: jest.fn() } : undefined },
  });
  mockUseAgentBuilderAvailability.mockReturnValue({ isAgentChatExperienceEnabled: agentChat });
  mockUseIsExperimentalFeatureEnabled.mockReturnValue(leadGeneration);
  mockUseLicense.mockReturnValue({ isEnterprise: () => enterprise });
  mockUseLeadGenerationPrivileges.mockReturnValue({
    data: { has_read_permissions: canReadLeads },
  });
  return renderHook(() => useHuntWithAiAvailability());
};

describe('useHuntWithAiAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is available when every check passes', () => {
    const { result } = setup();

    expect(result.current).toBe(true);
    expect(mockUseLeadGenerationPrivileges).toHaveBeenCalledWith(true);
  });

  it.each([
    ['the agent chat experience is off', { agentChat: false }],
    ['agent builder is missing', { agentBuilder: false }],
    ['lead generation is disabled', { leadGeneration: false }],
    ['the license is below Enterprise', { enterprise: false }],
  ])('is not available and skips the privileges check when %s', (_, options) => {
    const { result } = setup(options);

    expect(result.current).toBe(false);
    expect(mockUseLeadGenerationPrivileges).toHaveBeenCalledWith(false);
  });

  it('is not available when the user cannot read leads', () => {
    const { result } = setup({ canReadLeads: false });

    expect(result.current).toBe(false);
  });

  it('is not available while the privileges are loading', () => {
    setup();
    mockUseLeadGenerationPrivileges.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useHuntWithAiAvailability());

    expect(result.current).toBe(false);
  });
});
