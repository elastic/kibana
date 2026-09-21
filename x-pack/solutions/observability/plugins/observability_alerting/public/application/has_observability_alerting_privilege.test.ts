/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import {
  hasObservabilityAlertingCapabilities,
  hasObservabilityAlertsV1Capability,
  hasObservabilityRulesV1Capability,
} from './has_observability_alerting_privilege';

const capabilities = (features: Record<string, Record<string, boolean>>): Capabilities =>
  ({
    navLinks: {},
    management: {},
    catalogue: {},
    ...features,
  } as Capabilities);

describe('hasObservabilityRulesV1Capability', () => {
  it('returns true for apm navLink', () => {
    expect(hasObservabilityRulesV1Capability(capabilities({ navLinks: { apm: true } }))).toBe(true);
  });

  it('returns true for metrics navLink', () => {
    expect(hasObservabilityRulesV1Capability(capabilities({ navLinks: { metrics: true } }))).toBe(
      true
    );
  });

  it('returns true for uptime navLink', () => {
    expect(hasObservabilityRulesV1Capability(capabilities({ navLinks: { uptime: true } }))).toBe(
      true
    );
  });

  it('returns true for synthetics navLink', () => {
    expect(
      hasObservabilityRulesV1Capability(capabilities({ navLinks: { synthetics: true } }))
    ).toBe(true);
  });

  it('returns true for slo navLink', () => {
    expect(hasObservabilityRulesV1Capability(capabilities({ navLinks: { slo: true } }))).toBe(true);
  });

  it('returns true for logs.show', () => {
    expect(hasObservabilityRulesV1Capability(capabilities({ logs: { show: true } }))).toBe(true);
  });

  it('returns false without any observability capability', () => {
    expect(hasObservabilityRulesV1Capability(capabilities({}))).toBe(false);
  });
});

describe('hasObservabilityAlertsV1Capability', () => {
  it('returns true for observabilityAlerts.show', () => {
    expect(
      hasObservabilityAlertsV1Capability(capabilities({ observabilityAlerts: { show: true } }))
    ).toBe(true);
  });

  it('returns true when rules v1 capability is present', () => {
    expect(hasObservabilityAlertsV1Capability(capabilities({ navLinks: { apm: true } }))).toBe(
      true
    );
  });

  it('returns false without any observability capability', () => {
    expect(hasObservabilityAlertsV1Capability(capabilities({}))).toBe(false);
  });
});

describe('hasObservabilityAlertingCapabilities', () => {
  describe('alerts', () => {
    it('returns v1: true for observabilityAlerts.show', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ observabilityAlerts: { show: true } }),
        'alerts'
      );
      expect(result).toEqual({ v1: true, v2: false });
    });

    it('returns v1: true for logs.show', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ logs: { show: true } }),
        'alerts'
      );
      expect(result).toEqual({ v1: true, v2: false });
    });

    it('returns v2: true for alerting_v2_alerts read', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ alerting_v2_alerts: { read: true } }),
        'alerts'
      );
      expect(result).toEqual({ v1: false, v2: true });
    });

    it('returns both true when v1 and v2 capabilities present', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({
          observabilityAlerts: { show: true },
          alerting_v2_alerts: { read: true },
        }),
        'alerts'
      );
      expect(result).toEqual({ v1: true, v2: true });
    });

    it('returns both false without any alerting capability', () => {
      const result = hasObservabilityAlertingCapabilities(capabilities({}), 'alerts');
      expect(result).toEqual({ v1: false, v2: false });
    });
  });

  describe('rules', () => {
    it('returns v1: true for apm navLink', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ navLinks: { apm: true } }),
        'rules'
      );
      expect(result).toEqual({ v1: true, v2: false });
    });

    it('returns v2: true for alerting_v2_rules read', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ alerting_v2_rules: { read: true } }),
        'rules'
      );
      expect(result).toEqual({ v1: false, v2: true });
    });

    it('returns both false without any rules capability', () => {
      const result = hasObservabilityAlertingCapabilities(capabilities({}), 'rules');
      expect(result).toEqual({ v1: false, v2: false });
    });
  });

  describe('actionPolicies (v2-only)', () => {
    it('returns v1: false regardless of v1 capabilities', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ observabilityAlerts: { show: true }, navLinks: { apm: true } }),
        'actionPolicies'
      );
      expect(result.v1).toBe(false);
    });

    it('returns v2: true for alerting_v2_action_policies read', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ alerting_v2_action_policies: { read: true } }),
        'actionPolicies'
      );
      expect(result).toEqual({ v1: false, v2: true });
    });
  });

  describe('executionHistory (v2-only)', () => {
    it('returns v1: false regardless of v1 capabilities', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ observabilityAlerts: { show: true }, navLinks: { apm: true } }),
        'executionHistory'
      );
      expect(result.v1).toBe(false);
    });

    it('returns v2: true for alerting_v2_execution_history read', () => {
      const result = hasObservabilityAlertingCapabilities(
        capabilities({ alerting_v2_execution_history: { read: true } }),
        'executionHistory'
      );
      expect(result).toEqual({ v1: false, v2: true });
    });
  });
});
