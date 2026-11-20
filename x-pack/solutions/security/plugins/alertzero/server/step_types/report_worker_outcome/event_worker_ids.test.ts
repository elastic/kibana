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
  SYSTEM_SECURITY_WORKER_IDS,
} from '@kbn/alertzero-common';
import { REPORT_WORKER_OUTCOME_EVENTS } from '../../../common/step_types';
import { ANY_CATALOG_WORKER, EVENT_WORKER_IDS, isEventFromItsWorker } from './event_worker_ids';

describe('EVENT_WORKER_IDS', () => {
  it('names an owner for every event the step accepts', () => {
    expect(Object.keys(EVENT_WORKER_IDS).sort()).toEqual([...REPORT_WORKER_OUTCOME_EVENTS].sort());
  });

  it('names only catalogued Workers as owners', () => {
    expect(
      Object.values(EVENT_WORKER_IDS).filter(
        (owner) =>
          owner !== ANY_CATALOG_WORKER &&
          !(SYSTEM_SECURITY_WORKER_IDS as readonly string[]).includes(owner)
      )
    ).toEqual([]);
  });

  it('lets any catalogued Worker report only the run event and the Investigation close', () => {
    expect(
      REPORT_WORKER_OUTCOME_EVENTS.filter((event) => EVENT_WORKER_IDS[event] === ANY_CATALOG_WORKER)
    ).toEqual(['worker_investigation_closed', 'worker_run_completed']);
  });
});

describe('isEventFromItsWorker', () => {
  it.each([
    ['ad_worker_run_completed', SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID],
    ['ad_worker_review_started', SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID],
    ['ad_worker_analysis_completed', SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID],
    ['ad_worker_handoff_resolved', SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID],
    ['alert_triage_batch_classified', SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID],
    ['alert_triage_batch_grouped', SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID],
    ['alert_triage_closure_resolved', SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID],
    ['rule_tuning_review_completed', SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID],
    ['rule_coverage_review_completed', SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID],
    ['hunt_report_completed', SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID],
    ['endpoint_analysis_completed', SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID],
  ] as const)('accepts %s only from %s', (event, ownerId) => {
    expect(
      SYSTEM_SECURITY_WORKER_IDS.filter((workerId) => isEventFromItsWorker(event, workerId))
    ).toEqual([ownerId]);
  });

  it.each([['worker_run_completed'], ['worker_investigation_closed']] as const)(
    'accepts %s from every catalogued Worker',
    (event) => {
      expect(
        SYSTEM_SECURITY_WORKER_IDS.every((workerId) => isEventFromItsWorker(event, workerId))
      ).toBe(true);
    }
  );

  it.each([[undefined], [null], ['custom-workflow']])(
    'rejects a Worker-specific event from root %p',
    (rootWorkerId) => {
      expect(isEventFromItsWorker('ad_worker_run_completed', rootWorkerId)).toBe(false);
    }
  );
});
