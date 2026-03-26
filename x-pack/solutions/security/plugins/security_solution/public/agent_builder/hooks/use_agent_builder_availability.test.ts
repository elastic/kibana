/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';
import { useKibana } from '../../common/lib/kibana';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useLicense } from '../../common/hooks/use_license';

jest.mock('../../common/lib/kibana');
jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../../common/hooks/use_license');

const mockUseKibana = useKibana as jest.Mock;
const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const mockUseLicense = useLicense as jest.Mock;

describe('useAgentBuilderAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => true),
    });
  });

  it('returns isAgentBuilderEnabled true when agent builder privilege exists and chat experience is Agent', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {
              show: true,
            },
          },
        },
        pricing: {
          getActiveProduct: jest.fn(() => undefined),
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current).toEqual({
      isAgentBuilderEnabled: true,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    });
  });

  it('returns isAgentBuilderEnabled false when agent builder privilege is missing', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {},
        },
        pricing: {
          getActiveProduct: jest.fn(() => undefined),
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current).toEqual({
      isAgentBuilderEnabled: false,
      hasAgentBuilderPrivilege: false,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    });
  });

  it('returns isAgentBuilderEnabled false when agent builder privilege show is false', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {
              show: false,
            },
          },
        },
        pricing: {
          getActiveProduct: jest.fn(() => undefined),
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current).toEqual({
      isAgentBuilderEnabled: false,
      hasAgentBuilderPrivilege: false,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    });
  });

  it('returns isAgentBuilderEnabled false when chat experience is Classic', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {
              show: true,
            },
          },
        },
        pricing: {
          getActiveProduct: jest.fn(() => undefined),
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Classic]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current).toEqual({
      isAgentBuilderEnabled: false,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: false,
      hasValidAgentBuilderLicense: true,
    });
  });

  it('returns isAgentBuilderEnabled false when agent builder capabilities is undefined', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: undefined,
          },
        },
        pricing: {
          getActiveProduct: jest.fn(() => undefined),
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current).toEqual({
      isAgentBuilderEnabled: false,
      hasAgentBuilderPrivilege: false,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    });
  });

  it('returns isAgentBuilderEnabled false when agent builder capabilities show is undefined', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {},
          },
        },
        pricing: {
          getActiveProduct: jest.fn(() => undefined),
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current).toEqual({
      isAgentBuilderEnabled: false,
      hasAgentBuilderPrivilege: false,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    });
  });

  it('returns hasValidAgentBuilderLicense false when ESS license is invalid', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {
              show: true,
            },
          },
        },
        pricing: {
          getActiveProduct: jest.fn(() => undefined),
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn(() => false),
    });

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current).toEqual({
      isAgentBuilderEnabled: true,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: false,
    });
  });
});
