/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_FEATURE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from './constants';
import { WORKER_ROLE_DEFINITIONS, buildSecurityRoleUrl } from './worker_roles';

describe('WORKER_ROLE_DEFINITIONS', () => {
  it('defines one alertzero_<worker> role for each system worker', () => {
    expect(
      Object.fromEntries(
        Object.entries(WORKER_ROLE_DEFINITIONS).map(([id, { name }]) => [id, name])
      )
    ).toEqual({
      [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: 'alertzero_alert_triage',
      [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: 'alertzero_attack_discovery',
      [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: 'alertzero_endpoint_analysis',
      [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: 'alertzero_threat_hunt',
      [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: 'alertzero_rule_tuning',
      [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: 'alertzero_rule_coverage',
    });
  });

  it.each(Object.values(WORKER_ROLE_DEFINITIONS))(
    'grants $name the common baseline in every space',
    ({ role }) => {
      expect(role.elasticsearch.cluster).toEqual(['monitor_inference']);
      expect(role.elasticsearch.indices).toContainEqual({
        names: ['ai-index-idx-security-investigations'],
        privileges: ['read', 'view_index_metadata', 'index', 'auto_configure'],
      });
      expect(role.elasticsearch.indices).toContainEqual({
        names: ['.ai-index-idx-elastic-index'],
        privileges: ['read', 'view_index_metadata'],
      });
      expect(role.kibana).toHaveLength(1);
      expect(role.kibana[0].spaces).toEqual(['*']);
      expect(role.kibana[0].feature).toMatchObject({
        [ALERTZERO_FEATURE_ID]: ['all'],
        agentBuilder: ['read'],
        contextEngine: ['all'],
        proposals: ['all'],
        actions: ['read'],
      });
    }
  );

  it.each([
    [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID, ['.internal.alerts-security.alerts-*']],
    [
      SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      [
        '.internal.alerts-security.attack.discovery.alerts-*',
        '.internal.adhoc.alerts-security.attack.discovery.alerts-*',
      ],
    ],
    [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID, ['.internal.alerts-security.alerts-*']],
  ])('lets %s write to the backing indices of the alerts it updates by query', (id, names) => {
    expect(WORKER_ROLE_DEFINITIONS[id].role.elasticsearch.indices).toContainEqual({
      names,
      privileges: ['index', 'maintenance'],
    });
  });

  it('leaves out privileges only needed by approver-run rule actions', () => {
    const tuning = WORKER_ROLE_DEFINITIONS[SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID];
    const coverage = WORKER_ROLE_DEFINITIONS[SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID];

    expect(tuning.role.kibana[0].feature.securitySolutionRulesV4).toEqual(['read']);
    expect(coverage.role.kibana[0].feature.securitySolutionRulesV4).toEqual(['all']);
    expect(coverage.role.kibana[0].feature).not.toHaveProperty('siemV5');
  });

  it('encodes the role name in the role URL', () => {
    expect(buildSecurityRoleUrl('a/b')).toBe('/api/security/role/a%2Fb');
  });
});
