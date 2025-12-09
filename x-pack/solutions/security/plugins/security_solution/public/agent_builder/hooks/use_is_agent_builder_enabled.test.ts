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

jest.mock('../../common/lib/kibana');
jest.mock('@kbn/kibana-react-plugin/public');

const mockUseKibana = useKibana as jest.Mock;
const mockUseUiSetting$ = useUiSetting$ as jest.Mock;

describe('useAgentBuilderAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderEnabled).toBe(true);
    expect(result.current.hasAgentBuilderPrivilege).toBe(true);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
  });

  it('returns isAgentBuilderEnabled false when agent builder privilege is missing', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {},
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderEnabled).toBe(false);
    expect(result.current.hasAgentBuilderPrivilege).toBe(false);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
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
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderEnabled).toBe(false);
    expect(result.current.hasAgentBuilderPrivilege).toBe(false);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
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
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Classic]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderEnabled).toBe(false);
    expect(result.current.hasAgentBuilderPrivilege).toBe(true);
    expect(result.current.isAgentChatExperienceEnabled).toBe(false);
  });

  it('returns isAgentBuilderEnabled false when agent builder capabilities is undefined', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: undefined,
          },
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderEnabled).toBe(false);
    expect(result.current.hasAgentBuilderPrivilege).toBe(false);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
  });

  it('returns isAgentBuilderEnabled false when agent builder capabilities show is undefined', () => {
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: {},
          },
        },
      },
    });

    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderEnabled).toBe(false);
    expect(result.current.hasAgentBuilderPrivilege).toBe(false);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
  });
});
