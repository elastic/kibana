/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useIsInvestigateInResolverActionEnabled } from './investigate_in_resolver';
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import * as useExperimentalFeatures from '../../../../common/hooks/use_experimental_features';

// Mock the experimental features hook
jest.mock('../../../../common/hooks/use_experimental_features');
const mockUseIsExperimentalFeatureEnabled = jest.fn();

describe('InvestigateInResolverAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useExperimentalFeatures.useIsExperimentalFeatureEnabled as jest.Mock) =
      mockUseIsExperimentalFeatureEnabled;
    // Default to disabled for most tests
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
  });

  describe('useIsInvestigateInResolverActionEnabled', () => {
    it('returns false if agent.type does not equal endpoint', () => {
      const data: Ecs = { _id: '1', agent: { type: ['blah'] } };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeFalsy();
    });

    it('returns false if agent.type does not have endpoint in first array index', () => {
      const data: Ecs = { _id: '1', agent: { type: ['blah', 'endpoint'] } };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeFalsy();
    });

    it('returns false if process.entity_id is not defined', () => {
      const data: Ecs = { _id: '1', agent: { type: ['endpoint'] } };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeFalsy();
    });

    it('returns true if agent.type has endpoint in first array index', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['endpoint', 'blah'] },
        process: { entity_id: ['5'] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeTruthy();
    });

    it('returns false if multiple entity_ids', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['endpoint', 'blah'] },
        process: { entity_id: ['5', '10'] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeFalsy();
    });

    it('returns false if entity_id is an empty string', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['endpoint', 'blah'] },
        process: { entity_id: [''] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeFalsy();
    });

    it('returns true for process event from sysmon via filebeat', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['filebeat'] },
        event: { dataset: ['windows.sysmon_operational'] },
        process: { entity_id: ['always_unique'] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeTruthy();
    });

    it('returns false for process event from filebeat but not from sysmon', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['filebeat'] },
        event: { dataset: ['windows.not_sysmon'] },
        process: { entity_id: ['always_unique'] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeFalsy();
    });

    it('returns true for SentinelOne events regardless of experimental feature flag', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['filebeat'] },
        event: { module: ['sentinel_one'] },
        process: { entity_id: ['always_unique'] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeTruthy();
    });

    it('returns true for SentinelOne Cloud Funnel events regardless of experimental feature flag', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['filebeat'] },
        event: { module: ['sentinel_one_cloud_funnel'] },
        process: { entity_id: ['always_unique'] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeTruthy();
    });

    it('returns true for Crowdstrike events regardless of experimental feature flag', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['filebeat'] },
        event: { module: ['crowdstrike'] },
        process: { entity_id: ['always_unique'] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeTruthy();
    });

    it('returns true for JAMF Protect events regardless of experimental feature flag', () => {
      const data: Ecs = {
        _id: '1',
        agent: { type: ['filebeat'] },
        event: { module: ['jamf_protect'] },
        process: { entity_id: ['always_unique'] },
      };

      const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
        wrapper: TestProviders,
      });

      expect(result.current).toBeTruthy();
    });

    describe('Microsoft Defender for Endpoint integration', () => {
      it('returns true for Microsoft Defender events when experimental feature flag is enabled', () => {
        mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

        const data: Ecs = {
          _id: '1',
          agent: { type: ['filebeat'] },
          event: { module: ['m365_defender'] },
          process: { entity_id: ['always_unique'] },
        };

        const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
          wrapper: TestProviders,
        });

        expect(result.current).toBeTruthy();
        expect(mockUseIsExperimentalFeatureEnabled).toHaveBeenCalledWith(
          'microsoftDefenderEndpointDataInAnalyzerEnabled'
        );
      });

      it('returns false for Microsoft Defender events when experimental feature flag is disabled', () => {
        mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

        const data: Ecs = {
          _id: '1',
          agent: { type: ['filebeat'] },
          event: { module: ['m365_defender'] },
          process: { entity_id: ['always_unique'] },
        };

        const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
          wrapper: TestProviders,
        });

        expect(result.current).toBeFalsy();
        expect(mockUseIsExperimentalFeatureEnabled).toHaveBeenCalledWith(
          'microsoftDefenderEndpointDataInAnalyzerEnabled'
        );
      });

      it('returns true for microsoft_defender_endpoint module when experimental feature flag is enabled', () => {
        mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

        const data: Ecs = {
          _id: '1',
          agent: { type: ['filebeat'] },
          event: { module: ['microsoft_defender_endpoint'] },
          process: { entity_id: ['always_unique'] },
        };

        const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
          wrapper: TestProviders,
        });

        expect(result.current).toBeTruthy();
      });

      it('returns false for microsoft_defender_endpoint module when experimental feature flag is disabled', () => {
        mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);

        const data: Ecs = {
          _id: '1',
          agent: { type: ['filebeat'] },
          event: { module: ['microsoft_defender_endpoint'] },
          process: { entity_id: ['always_unique'] },
        };

        const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
          wrapper: TestProviders,
        });

        expect(result.current).toBeFalsy();
      });

      it('returns false for Microsoft Defender events without process entity_id even when feature flag is enabled', () => {
        mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

        const data: Ecs = {
          _id: '1',
          agent: { type: ['filebeat'] },
          event: { module: ['m365_defender'] },
        };

        const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
          wrapper: TestProviders,
        });

        expect(result.current).toBeFalsy();
      });

      it('returns false for Microsoft Defender events with empty process entity_id even when feature flag is enabled', () => {
        mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

        const data: Ecs = {
          _id: '1',
          agent: { type: ['filebeat'] },
          event: { module: ['m365_defender'] },
          process: { entity_id: [''] },
        };

        const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
          wrapper: TestProviders,
        });

        expect(result.current).toBeFalsy();
      });

      it('returns false for Microsoft Defender events with multiple process entity_ids even when feature flag is enabled', () => {
        mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

        const data: Ecs = {
          _id: '1',
          agent: { type: ['filebeat'] },
          event: { module: ['m365_defender'] },
          process: { entity_id: ['entity-1', 'entity-2'] },
        };

        const { result } = renderHook(() => useIsInvestigateInResolverActionEnabled(data), {
          wrapper: TestProviders,
        });

        expect(result.current).toBeFalsy();
      });
    });
  });
});
