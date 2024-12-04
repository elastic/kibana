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

describe('InvestigateInResolverAction', () => {
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
  });
});
