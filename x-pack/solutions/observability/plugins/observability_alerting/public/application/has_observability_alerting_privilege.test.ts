/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import {
  OBSERVABILITY_ALERTS_FEATURE_ID,
  STACK_ALERTS_ONLY_FEATURE_ID,
  AlertConsumers,
} from '@kbn/rule-data-utils';
import { hasObservabilityAlertingPrivilege } from './has_observability_alerting_privilege';

const capabilities = (features: Record<string, Record<string, boolean>>): Capabilities =>
  ({
    navLinks: {},
    management: {},
    catalogue: {},
    ...features,
  }) as Capabilities;

describe('hasObservabilityAlertingPrivilege', () => {
  describe('read', () => {
    it('allows a v1 logs show user', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ [AlertConsumers.LOGS]: { show: true } }),
          ['alerts'],
          'read'
        )
      ).toBe(true);
    });

    it('allows a v1 observabilityAlerts show user', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ [OBSERVABILITY_ALERTS_FEATURE_ID]: { show: true } }),
          ['alerts'],
          'read'
        )
      ).toBe(true);
    });

    it('allows a v1 stackAlertsOnly show user', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ [STACK_ALERTS_ONLY_FEATURE_ID]: { show: true } }),
          ['alerts'],
          'read'
        )
      ).toBe(true);
    });

    it('allows a v2 alerts read user', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ alerting_v2_alerts: { read: true } }),
          ['alerts'],
          'read'
        )
      ).toBe(true);
    });

    it('denies when the user has neither v1 show nor v2 read', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ advancedSettings: { show: true } }),
          ['alerts'],
          'read'
        )
      ).toBe(false);
    });

    it('denies a v2 user missing read on any requested feature', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({
            alerting_v2_alerts: { read: true },
            alerting_v2_rules: { read: false },
          }),
          ['alerts', 'rules'],
          'read'
        )
      ).toBe(false);
    });
  });

  describe('all', () => {
    it('allows a v1 observabilityAlerts write user', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ [OBSERVABILITY_ALERTS_FEATURE_ID]: { write: true } }),
          ['alerts'],
          'all'
        )
      ).toBe(true);
    });

    it('allows a v1 stackAlertsOnly write user', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ [STACK_ALERTS_ONLY_FEATURE_ID]: { write: true } }),
          ['alerts'],
          'all'
        )
      ).toBe(true);
    });

    it('denies a v1 logs all user because logs exposes save, not write', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({
            [AlertConsumers.LOGS]: { show: true, configureSource: true, save: true },
          }),
          ['alerts'],
          'all'
        )
      ).toBe(false);
    });

    it('allows a v2 alerts all user', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ alerting_v2_alerts: { all: true } }),
          ['alerts'],
          'all'
        )
      ).toBe(true);
    });

    it('denies a v2 read-only user', () => {
      expect(
        hasObservabilityAlertingPrivilege(
          capabilities({ alerting_v2_alerts: { read: true } }),
          ['alerts'],
          'all'
        )
      ).toBe(false);
    });

    it('denies when the user has neither v1 write nor v2 all', () => {
      expect(hasObservabilityAlertingPrivilege(capabilities({}), ['alerts'], 'all')).toBe(false);
    });
  });
});
