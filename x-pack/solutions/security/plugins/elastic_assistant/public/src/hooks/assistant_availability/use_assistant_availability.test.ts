/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAssistantAvailability } from './use_assistant_availability';
import { useLicense } from '../licence/use_licence';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';
import { LicenseService } from '../licence/license_service';
import { renderHook } from '@testing-library/react';
import { SECURITY_FEATURE_ID } from '../../../../common/constants';
import { ASSISTANT_FEATURE_ID } from '@kbn/security-solution-features/constants';
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
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
      isStarterPromptsEnabled: true,
      hasUpdateAIAssistantAnonymization: true,
      hasManageGlobalKnowledgeBase: true,
    });
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
      hasConnectorsAllPrivilege: true,
      hasConnectorsReadPrivilege: true,
      isAssistantEnabled: true,
      isAssistantVisible: false,
      isStarterPromptsEnabled: true,
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
      hasConnectorsAllPrivilege: false,
      hasConnectorsReadPrivilege: false,
      isAssistantEnabled: false,
      isAssistantVisible: false,
      isStarterPromptsEnabled: false,
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
      hasConnectorsAllPrivilege: false,
      hasConnectorsReadPrivilege: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
      isStarterPromptsEnabled: true,
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
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useAssistantAvailability());

    expect(result.current).toEqual({
      hasSearchAILakeConfigurations: false,
      hasAssistantPrivilege: false,
      hasConnectorsAllPrivilege: false,
      hasConnectorsReadPrivilege: false,
      isAssistantEnabled: true,
      isAssistantVisible: true,
      isStarterPromptsEnabled: true,
      hasUpdateAIAssistantAnonymization: false,
      hasManageGlobalKnowledgeBase: false,
    });
  });
});
