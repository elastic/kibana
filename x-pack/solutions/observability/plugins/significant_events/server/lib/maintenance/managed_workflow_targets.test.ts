/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId } from '@kbn/core-spaces-common';
import {
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  ALL_INSTALLABLE_WORKFLOW_IDS,
  buildCancelTargets,
  buildDisableTargets,
  GLOBAL_CORE_WORKFLOW_IDS,
  GLOBAL_MAINTENANCE_WORKFLOW_IDS,
  PER_SPACE_BOUND_WORKFLOW_IDS,
  SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
} from './managed_workflow_targets';

describe('managed_workflow_targets registry', () => {
  it('includes every installable workflow id in the maintenance sweep lists', () => {
    const maintenanceIds = new Set<string>([
      ...GLOBAL_MAINTENANCE_WORKFLOW_IDS,
      ...SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
    ]);

    for (const id of ALL_INSTALLABLE_WORKFLOW_IDS) {
      expect(maintenanceIds.has(id)).toBe(true);
    }
  });

  it('keeps Significant Events core workflows in the global maintenance set', () => {
    expect(GLOBAL_MAINTENANCE_WORKFLOW_IDS).toEqual([...GLOBAL_CORE_WORKFLOW_IDS]);
  });

  it('tracks continuous onboarding and sync as per-space scheduled workflows', () => {
    expect(SCHEDULED_MAINTENANCE_WORKFLOW_IDS).toEqual(
      expect.arrayContaining([
        NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
        NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
      ])
    );
  });

  it('cancels the bound entry points of a space on pause but never disables them', () => {
    const space = asSpaceId('space-a');

    for (const baseId of PER_SPACE_BOUND_WORKFLOW_IDS) {
      const target = { id: `${baseId}-space-a`, spaceId: space };
      expect(buildCancelTargets([space])).toContainEqual(target);
      expect(buildDisableTargets([space])).not.toContainEqual(target);
    }
  });

  it('tracks cleanup as a per-space scheduled workflow', () => {
    expect(SCHEDULED_MAINTENANCE_WORKFLOW_IDS).toContain(NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID);
    expect(buildDisableTargets([asSpaceId('space-a')])).toContainEqual({
      id: `${NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID}-space-a`,
      spaceId: asSpaceId('space-a'),
    });
  });
});
