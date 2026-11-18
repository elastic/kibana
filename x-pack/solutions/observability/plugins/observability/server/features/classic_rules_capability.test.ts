/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import {
  hasClassicAlertsReadCapability,
  hasClassicRulesReadCapability,
} from '@kbn/rule-data-utils';
import { getObservabilityAlertsFeature } from './alerts_feature';
import { getLogsFeature } from './logs_feature';

type PrivilegeLevel = 'all' | 'read';

const capabilitiesFromPrivilege = (feature: KibanaFeatureConfig, level: PrivilegeLevel) => {
  const privilege = feature.privileges?.[level];
  if (!privilege) {
    throw new Error(`${feature.id} ${level} privilege is missing`);
  }

  const navLinks = Object.fromEntries(
    (privilege.app ?? []).filter((appId) => appId !== 'kibana').map((appId) => [appId, true])
  );
  const ui = Object.fromEntries((privilege.ui ?? []).map((uiCapability) => [uiCapability, true]));

  return {
    navLinks,
    [feature.id]: ui,
  } as Parameters<typeof hasClassicRulesReadCapability>[0];
};

describe('registered Observability features and the classic rules gate', () => {
  it.each(['all', 'read'] as const)(
    'recognizes the logs %s privilege, which grants triggersActionsRules and rule read',
    (level) => {
      const feature = getLogsFeature();
      const privilege = feature.privileges?.[level];

      expect(privilege?.management?.insightsAndAlerting).toContain('triggersActionsRules');
      expect(privilege?.alerting?.rule?.[level === 'all' ? 'all' : 'read']?.length).toBeGreaterThan(
        0
      );
      expect(hasClassicRulesReadCapability(capabilitiesFromPrivilege(feature, level))).toBe(true);
    }
  );

  it.each(['all', 'read'] as const)(
    'treats observability alerts %s as alert read without rule read',
    (level) => {
      const feature = getObservabilityAlertsFeature();
      const privilege = feature.privileges?.[level];
      const capabilities = capabilitiesFromPrivilege(feature, level);

      expect(privilege?.management?.insightsAndAlerting).not.toContain('triggersActionsRules');
      expect(
        privilege?.alerting?.alert?.[level === 'all' ? 'all' : 'read']?.length
      ).toBeGreaterThan(0);
      expect(hasClassicRulesReadCapability(capabilities)).toBe(false);
      expect(hasClassicAlertsReadCapability(capabilities)).toBe(true);
    }
  );
});
