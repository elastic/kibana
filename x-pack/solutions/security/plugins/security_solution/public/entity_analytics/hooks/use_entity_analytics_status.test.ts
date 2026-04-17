/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskEngineStatusEnum } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import type { StoreStatus } from '../../../common/api/entity_analytics';

import {
  deriveEntityAnalyticsStatus,
  type EntityAnalyticsStatus,
} from './use_entity_analytics_status';

describe('deriveEntityAnalyticsStatus', () => {
  const base = {
    isEntityStoreFeatureFlagDisabled: false,
    isEntityStoreV2Enabled: false,
    isMutationLoading: false,
  };

  describe('when a mutation is loading', () => {
    it('returns enabling', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: 'running',
          isMutationLoading: true,
        })
      ).toBe('enabling');
    });
  });

  describe('when entity store feature flag is disabled (risk-engine-only mode)', () => {
    const featureFlagOff = { ...base, isEntityStoreFeatureFlagDisabled: true };

    it('returns not_installed when risk engine is NOT_INSTALLED', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...featureFlagOff,
          riskEngineStatus: RiskEngineStatusEnum.NOT_INSTALLED,
        })
      ).toBe('not_installed');
    });

    it('returns not_installed when risk engine status is undefined', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...featureFlagOff,
          riskEngineStatus: undefined,
        })
      ).toBe('not_installed');
    });

    it('returns enabled when risk engine is ENABLED', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...featureFlagOff,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
        })
      ).toBe('enabled');
    });

    it('returns disabled when risk engine is DISABLED', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...featureFlagOff,
          riskEngineStatus: RiskEngineStatusEnum.DISABLED,
        })
      ).toBe('disabled');
    });
  });

  describe('when entity store is installing', () => {
    it('returns enabling', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...base,
          riskEngineStatus: RiskEngineStatusEnum.NOT_INSTALLED,
          entityStoreStatus: 'installing',
        })
      ).toBe('enabling');
    });
  });

  describe('when entity store has an error', () => {
    it('returns error', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: 'error',
        })
      ).toBe('error');
    });
  });

  describe('both engines enabled', () => {
    it('returns enabled when risk=ENABLED and store=running', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: 'running',
        })
      ).toBe('enabled');
    });
  });

  describe('both engines off', () => {
    const offCombinations: Array<{
      risk:
        | typeof RiskEngineStatusEnum.NOT_INSTALLED
        | typeof RiskEngineStatusEnum.DISABLED
        | undefined;
      store: StoreStatus | undefined;
      expected: EntityAnalyticsStatus;
    }> = [
      {
        risk: RiskEngineStatusEnum.NOT_INSTALLED,
        store: 'not_installed',
        expected: 'not_installed',
      },
      { risk: undefined, store: undefined, expected: 'not_installed' },
      { risk: undefined, store: 'not_installed', expected: 'not_installed' },
      { risk: RiskEngineStatusEnum.NOT_INSTALLED, store: undefined, expected: 'not_installed' },
      { risk: RiskEngineStatusEnum.DISABLED, store: 'stopped', expected: 'disabled' },
      { risk: RiskEngineStatusEnum.DISABLED, store: 'not_installed', expected: 'disabled' },
      { risk: RiskEngineStatusEnum.NOT_INSTALLED, store: 'stopped', expected: 'disabled' },
    ];

    it.each(offCombinations)(
      'returns $expected when risk=$risk and store=$store',
      ({ risk, store, expected }) => {
        expect(
          deriveEntityAnalyticsStatus({
            ...base,
            riskEngineStatus: risk,
            entityStoreStatus: store,
          })
        ).toBe(expected);
      }
    );
  });

  describe('partially enabled', () => {
    it('returns partially_enabled when risk=ENABLED but store=stopped', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: 'stopped',
        })
      ).toBe('partially_enabled');
    });

    it('returns partially_enabled when risk=DISABLED but store=running', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...base,
          riskEngineStatus: RiskEngineStatusEnum.DISABLED,
          entityStoreStatus: 'running',
        })
      ).toBe('partially_enabled');
    });

    it('returns partially_enabled when risk=NOT_INSTALLED but store=running', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...base,
          riskEngineStatus: RiskEngineStatusEnum.NOT_INSTALLED,
          entityStoreStatus: 'running',
        })
      ).toBe('partially_enabled');
    });

    it('returns partially_enabled when risk=ENABLED but store=not_installed', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: 'not_installed',
        })
      ).toBe('partially_enabled');
    });
  });

  describe('entity store v2 (entity store is sole status driver)', () => {
    const v2Base = { ...base, isEntityStoreV2Enabled: true };

    it('returns enabled when store=running regardless of risk engine status', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...v2Base,
          riskEngineStatus: RiskEngineStatusEnum.DISABLED,
          entityStoreStatus: 'running',
        })
      ).toBe('enabled');
    });

    it('returns disabled when store=stopped regardless of risk engine status', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...v2Base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: 'stopped',
        })
      ).toBe('disabled');
    });

    it('returns not_installed when store=not_installed regardless of risk engine status', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...v2Base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: 'not_installed',
        })
      ).toBe('not_installed');
    });

    it('returns not_installed when store status is undefined', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...v2Base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: undefined,
        })
      ).toBe('not_installed');
    });

    it('returns enabling when store=installing', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...v2Base,
          riskEngineStatus: RiskEngineStatusEnum.DISABLED,
          entityStoreStatus: 'installing',
        })
      ).toBe('enabling');
    });

    it('returns error when store=error', () => {
      expect(
        deriveEntityAnalyticsStatus({
          ...v2Base,
          riskEngineStatus: RiskEngineStatusEnum.ENABLED,
          entityStoreStatus: 'error',
        })
      ).toBe('error');
    });
  });
});
