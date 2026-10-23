/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from './constants';
import {
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  getWorkerRoleName,
} from './worker_roles';

describe('worker roles', () => {
  it('names one alertzero_<worker> service account for each system worker', () => {
    expect(WORKER_SERVICE_ACCOUNT_NAMES).toEqual({
      [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: 'alertzero_alert_triage',
      [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: 'alertzero_attack_discovery',
      [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: 'alertzero_endpoint_analysis',
      [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: 'alertzero_threat_hunt',
      [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: 'alertzero_rule_tuning',
      [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: 'alertzero_rule_coverage',
    });
  });

  it('encodes the role name in the role URL', () => {
    expect(buildSecurityRoleUrl('a/b')).toBe('/api/security/role/a%2Fb');
  });

  it('names the built-in role after the account, with the predefined-role prefix on Serverless', () => {
    expect(getWorkerRoleName('alertzero_alert_triage', { isServerless: false })).toBe(
      'alertzero_alert_triage'
    );
    expect(getWorkerRoleName('alertzero_alert_triage', { isServerless: true })).toBe(
      '_alertzero_alert_triage'
    );
  });
});
