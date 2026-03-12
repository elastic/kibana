/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantAvailability } from './use_assistant_availability';
import { useLicense } from '../licence/use_licence';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';
import type { LicenseService } from '../licence/license_service';
import { renderHook } from '@testing-library/react';
import { SECURITY_FEATURE_ID } from '../../../../common/constants';
import { ASSISTANT_FEATURE_ID } from '@kbn/security-solution-features/constants';
import { AGENTBUILDER_FEATURE_ID, uiPrivileges } from '@kbn/agent-builder-plugin/public';
import { useIsNavControlVisible } from '../is_nav_control_visible/use_is_nav_control_visible';

jest.mock('../licence/use_licence');
jest.mock('../../context/typed_kibana_context/typed_kibana_context');
jest.mock('../is_nav_control_visible/use_is_nav_control_visible');

const mockUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseIsNavControlVisible = useIsNavControlVisible as jest.MockedFunction<
  typeof useIsNavControlVisible
>;

describe('useAssistantAvailability', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseIsNavControlVisible.mockReturnValue({
      isVisible: true,
    });
  });

  it('returns correct values when all privileges are available', () => {
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn().mockReturnValue(true),
    } as unknown as LicenseService);

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ASSISTANT_FEATURE_ID]: {
              'ai-assistant': true,
              updateAIAssistantAnonymization: true,
              manageGlobalKnowledgeBaseAIAssistant: true,
            },
            [SECURITY_FEATURE_ID]: {
              configurations: true,
            },
            actions: {
              show: true,
              execute: true,
              save: true,
              delete: true,
            },
            management: {
              ai: {
                aiAssistantManagementSelection: true,
              },
            },
          },
        },
        aiAssistantManagementSelection: {
          aiAssistantManagementSelection$: jest.fn(),
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useAssistantAvailability());

    expect(result.current).toEqual({
      hasSearchAILakeConfigurations: true,
      hasAssistantPrivilege: true,
      hasAgentBuilderPrivilege: false,
      hasAgentBuilderManagePrivilege: false,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
      isAssistantManagementEnabled: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
    });
  });

  describe('hasAgentBuilderManagePrivilege capability mapping', () => {
    const enterpriseLicense = {
      isEnterprise: jest.fn().mockReturnValue(true),
    } as unknown as LicenseService;

    const agentBuilderPrivilegeCases = [
      {
        scenario: 'manageAgents is true and advanced settings save is true',
        agentBuilderCapabilities: { show: true, [uiPrivileges.manageAgents]: true },
        advancedSettingsSave: true,
        expected: true,
      },
      {
        scenario: 'legacy showManagement is true and advanced settings save is true',
        agentBuilderCapabilities: { show: true, showManagement: true },
        advancedSettingsSave: true,
        expected: true,
      },
      {
        scenario: 'manageAgents false and showManagement true with advanced settings save true',
        agentBuilderCapabilities: {
          show: true,
          [uiPrivileges.manageAgents]: false,
          showManagement: true,
        },
        advancedSettingsSave: true,
        expected: true,
      },
      {
        scenario: 'manageAgents and showManagement are false with advanced settings save true',
        agentBuilderCapabilities: {
          show: true,
          [uiPrivileges.manageAgents]: false,
          showManagement: false,
        },
        advancedSettingsSave: true,
        expected: false,
      },
      {
        scenario: 'agentBuilder capabilities are missing with advanced settings save true',
        agentBuilderCapabilities: undefined,
        advancedSettingsSave: true,
        expected: false,
      },
      {
        scenario: 'manageAgents is true but advanced settings save is false',
        agentBuilderCapabilities: { show: true, [uiPrivileges.manageAgents]: true },
        advancedSettingsSave: false,
        expected: false,
      },
      {
        scenario: 'legacy showManagement is true but advanced settings save is false',
        agentBuilderCapabilities: { show: true, showManagement: true },
        advancedSettingsSave: false,
        expected: false,
      },
    ] as const;

    it.each(agentBuilderPrivilegeCases)(
      'returns hasAgentBuilderManagePrivilege as $expected when $scenario',
      ({ agentBuilderCapabilities, advancedSettingsSave, expected }) => {
        mockUseLicense.mockReturnValue(enterpriseLicense);

        const maybeAgentBuilderCapabilities =
          agentBuilderCapabilities != null
            ? { [AGENTBUILDER_FEATURE_ID]: agentBuilderCapabilities }
            : {};

        mockUseKibana.mockReturnValue({
          services: {
            application: {
              capabilities: {
                [ASSISTANT_FEATURE_ID]: {
                  'ai-assistant': true,
                  updateAIAssistantAnonymization: true,
                  manageGlobalKnowledgeBaseAIAssistant: true,
                },
                [SECURITY_FEATURE_ID]: {
                  configurations: true,
                },
                ...maybeAgentBuilderCapabilities,
                advancedSettings: {
                  save: advancedSettingsSave,
                },
                actions: {
                  show: true,
                  execute: true,
                  save: true,
                  delete: true,
                },
              },
            },
            featureFlags: {
              getBooleanValue: jest.fn().mockReturnValue(true),
            },
          },
        } as unknown as ReturnType<typeof useKibana>);

        const { result } = renderHook(() => useAssistantAvailability());

        expect(result.current.hasAgentBuilderManagePrivilege).toBe(expected);
      }
    );
  });

  it('returns correct values when all privileges are available but assistant his hidden', () => {
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn().mockReturnValue(true),
    } as unknown as LicenseService);

    mockUseIsNavControlVisible.mockReturnValue({
      isVisible: false,
    });

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ASSISTANT_FEATURE_ID]: {
              'ai-assistant': true,
              updateAIAssistantAnonymization: true,
              manageGlobalKnowledgeBaseAIAssistant: true,
            },
            [SECURITY_FEATURE_ID]: {
              configurations: true,
            },
            actions: {
              show: true,
              execute: true,
              save: true,
              delete: true,
            },
            management: {
              ai: {
                aiAssistantManagementSelection: true,
              },
            },
          },
        },
        aiAssistantManagementSelection: {
          aiAssistantManagementSelection$: jest.fn(),
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useAssistantAvailability());

    expect(result.current).toEqual({
      hasSearchAILakeConfigurations: true,
      hasAssistantPrivilege: true,
      hasAgentBuilderPrivilege: false,
      hasAgentBuilderManagePrivilege: false,
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      isAssistantEnabled: true,
      isAssistantVisible: false,
      isAssistantManagementEnabled: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
    });
  });

  it('returns correct values when no privileges are available', () => {
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn().mockReturnValue(false),
    } as unknown as LicenseService);

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ASSISTANT_FEATURE_ID]: {
              'ai-assistant': false,
              updateAIAssistantAnonymization: false,
              manageGlobalKnowledgeBaseAIAssistant: false,
            },
            [SECURITY_FEATURE_ID]: {
              configurations: false,
            },
            actions: {
              show: false,
              execute: false,
              save: false,
              delete: false,
            },
            management: {
              ai: {
                aiAssistantManagementSelection: false,
              },
            },
          },
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(false),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useAssistantAvailability());

    expect(result.current).toEqual({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: false,
      hasAgentBuilderPrivilege: false,
      hasAgentBuilderManagePrivilege: false,
      hasConnectorsAllPrivilege: false,
      hasConnectorsReadPrivilege: false,
      isAssistantEnabled: false,
      isAssistantVisible: false,
      isAssistantManagementEnabled: false,
      hasUpdateAIAssistantAnonymization: false,
      hasManageGlobalKnowledgeBase: false,
    });
  });

  it('returns correct values when only read privileges are available', () => {
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn().mockReturnValue(true),
    } as unknown as LicenseService);

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {
            [ASSISTANT_FEATURE_ID]: {
              'ai-assistant': true,
              updateAIAssistantAnonymization: false,
              manageGlobalKnowledgeBaseAIAssistant: false,
            },
            [SECURITY_FEATURE_ID]: {
              configurations: false,
            },
            actions: {
              show: true,
              execute: true,
              save: false,
              delete: false,
            },
          },
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useAssistantAvailability());

    expect(result.current).toEqual({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: true,
      hasAgentBuilderPrivilege: false,
      hasAgentBuilderManagePrivilege: false,
      hasConnectorsAllPrivilege: false,
      hasConnectorsReadPrivilege: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
      isAssistantManagementEnabled: true,
      hasUpdateAIAssistantAnonymization: false,
      hasManageGlobalKnowledgeBase: false,
    });
  });

  it('handles missing capabilities gracefully', () => {
    mockUseLicense.mockReturnValue({
      isEnterprise: jest.fn().mockReturnValue(true),
    } as unknown as LicenseService);

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {},
        },
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(false),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useAssistantAvailability());

    expect(result.current).toEqual({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: false,
      hasAgentBuilderPrivilege: false,
      hasAgentBuilderManagePrivilege: false,
      hasConnectorsAllPrivilege: false,
      hasConnectorsReadPrivilege: false,
      isAssistantEnabled: true,
      isAssistantVisible: true,
      isAssistantManagementEnabled: false,
      hasUpdateAIAssistantAnonymization: false,
      hasManageGlobalKnowledgeBase: false,
    });
  });
});
