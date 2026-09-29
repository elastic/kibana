/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { useFetchAnonymizationFields } from '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';
import { API_VERSIONS, ATTACK_DISCOVERY_GENERATE } from '@kbn/elastic-assistant-common';
import { renderHook, act } from '@testing-library/react';
import { of } from 'rxjs';
import React from 'react';

import { useKibana } from '../../../common/lib/kibana';
import { useAttackDiscovery } from '.';
import { AttackDiscoveryEventTypes } from '../../../common/lib/telemetry';
import { ERROR_GENERATING_ATTACK_DISCOVERIES } from '../translations';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { createQueryWrapperMock } from '../../../common/__mocks__/query_wrapper';

vi.mock('../../../assistant/use_assistant_availability', () => {
      const mocked = {
      useAssistantAvailability: vi.fn(() => ({
        hasAssistantPrivilege: true,
        isAssistantEnabled: true,
        isAssistantVisible: true,
      })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock(
  '@kbn/elastic-assistant/impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields'
);
vi.mock('../../../common/lib/kibana');
const mockedUseKibana = mockUseKibana();

const mockAssistantAvailability = vi.fn(() => ({
  hasAssistantPrivilege: true,
}));
const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
  },
];
vi.mock('@kbn/elastic-assistant', () => {
      const mocked = {
      AssistantOverlay: () => <div data-test-subj="assistantOverlay" />,
      useAssistantContext: () => ({
        alertsIndexPattern: 'alerts-index-pattern',
        assistantAvailability: mockAssistantAvailability(),
        knowledgeBase: {
          latestAlerts: 20,
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/inference-connectors', () => {
      const mocked = {
      useLoadConnectors: vi.fn(() => ({
        isFetched: true,
        data: mockConnectors,
      })),
    };
      return { ...mocked, default: mocked };
    });

const setLoadingConnectorId = vi.fn();

const SIZE = 20;

const { wrapper: queryWrapper } = createQueryWrapperMock();

describe('useAttackDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock feature flags service to return false by default
    mockedUseKibana.services.featureFlags.getBooleanValue$ = vi.fn().mockReturnValue(of(false));
    (useKibana as Mock).mockReturnValue(mockedUseKibana);
    (useFetchAnonymizationFields as Mock).mockReturnValue({ data: [] });
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(
      () =>
        useAttackDiscovery({
          connectorId: 'test-id',
          setLoadingConnectorId,
          size: 20,
        }),
      {
        wrapper: queryWrapper,
      }
    );

    expect(result.current.isLoading).toBe(false);
  });

  it('calls POST with the public API route', async () => {
    (mockedUseKibana.services.http.post as Mock).mockResolvedValue({});
    const { result } = renderHook(
      () =>
        useAttackDiscovery({
          connectorId: 'test-id',
          setLoadingConnectorId,
          size: 20,
        }),
      {
        wrapper: queryWrapper,
      }
    );

    await act(async () => {
      await result.current.fetchAttackDiscoveries();
    });

    expect(mockedUseKibana.services.http.post as Mock).toHaveBeenCalledWith(
      ATTACK_DISCOVERY_GENERATE,
      expect.objectContaining({
        version: API_VERSIONS.public.v1,
      })
    );
  });

  it('calls POST using the public API version', async () => {
    (mockedUseKibana.services.http.post as Mock).mockResolvedValue({});
    const { result } = renderHook(
      () =>
        useAttackDiscovery({
          connectorId: 'test-id',
          setLoadingConnectorId,
          size: SIZE,
        }),
      {
        wrapper: queryWrapper,
      }
    );

    await act(async () => {
      await result.current.fetchAttackDiscoveries();
    });

    expect(mockedUseKibana.services.http.post as Mock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        version: API_VERSIONS.public.v1,
      })
    );
  });

  it("reports GenerationStarted telemetry with execution_mode 'legacy' on the public path", async () => {
    (mockedUseKibana.services.http.post as Mock).mockResolvedValue({});

    const { result } = renderHook(
      () =>
        useAttackDiscovery({
          connectorId: 'test-id',
          setLoadingConnectorId,
          size: SIZE,
        }),
      {
        wrapper: queryWrapper,
      }
    );

    await act(async () => {
      await result.current.fetchAttackDiscoveries();
    });

    expect(mockedUseKibana.services.telemetry.reportEvent).toHaveBeenCalledWith(
      AttackDiscoveryEventTypes.GenerationStarted,
      expect.objectContaining({ execution_mode: 'legacy' })
    );
  });

  it('handles fetch errors correctly', async () => {
    const errorMessage = 'Fetch error';
    const error = new Error(errorMessage);
    (mockedUseKibana.services.http.post as Mock).mockRejectedValue(error);

    const { result } = renderHook(
      () => useAttackDiscovery({ connectorId: 'test-id', size: SIZE }),
      {
        wrapper: queryWrapper,
      }
    );

    await act(async () => {
      await result.current.fetchAttackDiscoveries();
    });

    expect(mockedUseKibana.services.notifications.toasts.addDanger).toHaveBeenCalledWith(error, {
      title: ERROR_GENERATING_ATTACK_DISCOVERIES,
      text: errorMessage,
    });
    expect(result.current.isLoading).toBe(false);
  });

  describe('when the feature flag is ON but the per-space uiSetting is OFF', () => {
    beforeEach(() => {
      mockedUseKibana.services.featureFlags.getBooleanValue$ = vi.fn().mockReturnValue(of(true));
      mockedUseKibana.services.uiSettings.get = vi.fn().mockReturnValue(false);
    });

    afterEach(() => {
      mockedUseKibana.services.featureFlags.getBooleanValue$ = vi.fn().mockReturnValue(of(false));
      mockedUseKibana.services.uiSettings.get = vi.fn().mockReturnValue(false);
    });

    it('calls the public API route when the uiSetting is off (FF on, setting off → legacy)', async () => {
      (mockedUseKibana.services.http.post as Mock).mockResolvedValue({});

      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: 20,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      expect(mockedUseKibana.services.http.post as Mock).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_GENERATE,
        expect.objectContaining({
          version: API_VERSIONS.public.v1,
        })
      );
    });
  });

  it('reads the feature flag with the correct key and a true default (ON by default)', async () => {
    (mockedUseKibana.services.http.post as Mock).mockResolvedValue({});

    const { result } = renderHook(
      () =>
        useAttackDiscovery({
          connectorId: 'test-id',
          setLoadingConnectorId,
          size: SIZE,
        }),
      {
        wrapper: queryWrapper,
      }
    );

    await act(async () => {
      await result.current.fetchAttackDiscoveries();
    });

    expect(mockedUseKibana.services.featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      'securitySolution.attackDiscoveryWorkflowsEnabled',
      true
    );
  });

  describe('when the feature flag is OFF but the per-space uiSetting is ON', () => {
    beforeEach(() => {
      mockedUseKibana.services.featureFlags.getBooleanValue$ = vi.fn().mockReturnValue(of(false));
      mockedUseKibana.services.uiSettings.get = vi.fn().mockReturnValue(true);
    });

    afterEach(() => {
      mockedUseKibana.services.featureFlags.getBooleanValue$ = vi.fn().mockReturnValue(of(false));
      mockedUseKibana.services.uiSettings.get = vi.fn().mockReturnValue(false);
    });

    it('calls the public API route when the FF is off (FF off, setting on → legacy)', async () => {
      (mockedUseKibana.services.http.post as Mock).mockResolvedValue({});

      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: 20,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      expect(mockedUseKibana.services.http.post as Mock).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_GENERATE,
        expect.objectContaining({
          version: API_VERSIONS.public.v1,
        })
      );
    });
  });

  describe('when attackDiscoveryWorkflowsEnabled feature flag is enabled', () => {
    beforeEach(() => {
      // Mock feature flags service to return true for this test suite
      mockedUseKibana.services.featureFlags.getBooleanValue$ = vi.fn().mockReturnValue(of(true));
      // Also enable the per-space uiSetting opt-in
      mockedUseKibana.services.uiSettings.get = vi.fn().mockReturnValue(true);
    });

    afterEach(() => {
      // Reset to default (false)
      mockedUseKibana.services.featureFlags.getBooleanValue$ = vi.fn().mockReturnValue(of(false));
      mockedUseKibana.services.uiSettings.get = vi.fn().mockReturnValue(false);
    });

    it('calls the internal API with workflow configuration', async () => {
      (mockedUseKibana.services.http.post as Mock).mockResolvedValue({
        execution_uuid: 'test-uuid',
      });

      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: 20,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      expect(mockedUseKibana.services.http.post as Mock).toHaveBeenCalledWith(
        '/internal/attack_discovery/_generate',
        expect.objectContaining({
          version: '1',
          body: expect.stringContaining('workflow_config'),
        })
      );
    });

    it('includes workflow configuration in request body', async () => {
      (mockedUseKibana.services.http.post as Mock).mockResolvedValue({
        execution_uuid: 'test-uuid',
      });

      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: 20,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      const callArgs = (mockedUseKibana.services.http.post as Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.workflow_config).toEqual({
        alert_retrieval_mode: 'custom_query',
        alert_retrieval_workflow_ids: [],
        alert_retrieval_workflows_enabled: false,
        default_retrieval_enabled: false,
        skill_enabled: true,
        validation_workflow_id: 'default',
      });
    });

    it("reports GenerationStarted telemetry with execution_mode 'workflow'", async () => {
      (mockedUseKibana.services.http.post as Mock).mockResolvedValue({
        execution_uuid: 'test-uuid',
      });

      const { result } = renderHook(
        () =>
          useAttackDiscovery({
            connectorId: 'test-id',
            setLoadingConnectorId,
            size: 20,
          }),
        {
          wrapper: queryWrapper,
        }
      );

      await act(async () => {
        await result.current.fetchAttackDiscoveries();
      });

      expect(mockedUseKibana.services.telemetry.reportEvent).toHaveBeenCalledWith(
        AttackDiscoveryEventTypes.GenerationStarted,
        expect.objectContaining({ execution_mode: 'workflow' })
      );
    });
  });
});
