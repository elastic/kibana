/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_IDS,
} from '@kbn/alertzero-common';
import { getManagedYaml } from '../../step_types/report_worker_outcome/shipped_yaml_contract.test_helpers';
import { OTHER_WORKER_ID, TRIGGER_TYPES } from '../constants';
import {
  CONFIGURED_AUTONOMY_TRIGGER_TYPES,
  usesConfiguredAutonomy,
} from './uses_configured_autonomy';

const TRIGGER_DEPENDENT_WORKER_IDS = Object.keys(CONFIGURED_AUTONOMY_TRIGGER_TYPES);

const OTHER_WORKER_IDS = SYSTEM_SECURITY_WORKER_IDS.filter(
  (workerId) => !TRIGGER_DEPENDENT_WORKER_IDS.includes(workerId)
);

describe('usesConfiguredAutonomy', () => {
  it.each([
    ['scheduled', true],
    ...TRIGGER_TYPES.filter((triggerType) => triggerType !== 'scheduled').map(
      (triggerType) => [triggerType, false] as const
    ),
  ] as const)(
    'for an Endpoint Analysis run triggered by %s, uses the configured autonomy: %s',
    (triggerType, expected) => {
      const result = usesConfiguredAutonomy({
        triggerType,
        workerId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
      });

      expect(result).toBe(expected);
    }
  );

  it.each(
    OTHER_WORKER_IDS.flatMap((workerId) =>
      TRIGGER_TYPES.map((triggerType) => [workerId, triggerType] as const)
    )
  )('uses the configured autonomy for %s whatever the trigger (%s)', (workerId, triggerType) => {
    const result = usesConfiguredAutonomy({ triggerType, workerId });

    expect(result).toBe(true);
  });

  it('uses the configured autonomy for a root outside the catalog', () => {
    const result = usesConfiguredAutonomy({ triggerType: 'manual', workerId: OTHER_WORKER_ID });

    expect(result).toBe(true);
  });

  // The YAML expression the table mirrors. A Worker that starts branching on the trigger must be
  // reviewed for this table, and a listed Worker that stops branching must leave it.
  it.each(SYSTEM_SECURITY_WORKER_IDS.map((workerId) => [workerId]))(
    'lists %s exactly when its shipped YAML reads `execution.triggeredBy`',
    (workerId) => {
      const readsTrigger = getManagedYaml(workerId).includes('execution.triggeredBy');

      expect(TRIGGER_DEPENDENT_WORKER_IDS.includes(workerId)).toBe(readsTrigger);
    }
  );
});
