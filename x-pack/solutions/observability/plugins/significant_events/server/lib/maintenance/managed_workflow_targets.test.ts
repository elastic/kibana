/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId } from '@kbn/core-spaces-common';
import {
  SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  ALL_INSTALLABLE_WORKFLOW_IDS,
  buildCancelTargets,
  buildDisableTargets,
  GLOBAL_CORE_WORKFLOW_IDS,
  GLOBAL_MAINTENANCE_WORKFLOW_IDS,
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

  it('keeps Significant Events core and lifecycle workflows in the global maintenance set', () => {
    expect(GLOBAL_MAINTENANCE_WORKFLOW_IDS).toEqual([
      ...GLOBAL_CORE_WORKFLOW_IDS,
      SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID,
    ]);
  });

  it('tracks continuous onboarding and sync as per-space scheduled workflows', () => {
    expect(SCHEDULED_MAINTENANCE_WORKFLOW_IDS).toEqual(
      expect.arrayContaining([
        SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
        SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
      ])
    );
  });

  it('keeps the legacy default-space sync document in the default space sweeps only', () => {
    const legacySync = {
      id: SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
      spaceId: asSpaceId('default'),
    };

    expect(buildDisableTargets([asSpaceId('default')])).toContainEqual(legacySync);
    expect(buildCancelTargets([asSpaceId('default')])).toContainEqual(legacySync);
    expect(buildDisableTargets([asSpaceId('space-a')])).not.toContainEqual(legacySync);
    expect(buildCancelTargets([asSpaceId('space-a')])).not.toContainEqual(legacySync);
  });

  it('never disables the shared workflows, which belong to every space', () => {
    const disabledIds = buildDisableTargets([asSpaceId('default'), asSpaceId('space-a')]).map(
      ({ id }) => id
    );
    for (const id of GLOBAL_MAINTENANCE_WORKFLOW_IDS) {
      expect(disabledIds).not.toContain(id);
    }
  });

  it('cancels executions of the shared workflows in each swept space', () => {
    const cancelTargets = buildCancelTargets([asSpaceId('space-a')]);
    for (const id of GLOBAL_MAINTENANCE_WORKFLOW_IDS) {
      expect(cancelTargets).toContainEqual({ id, spaceId: asSpaceId('space-a') });
    }
    // Only the swept space: another space's executions are not touched.
    expect(cancelTargets.every(({ spaceId }) => spaceId === 'space-a')).toBe(true);
  });

  it('tracks cleanup as a per-space scheduled workflow', () => {
    expect(SCHEDULED_MAINTENANCE_WORKFLOW_IDS).toContain(SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID);
    expect(buildDisableTargets([asSpaceId('space-a')])).toContainEqual({
      id: `${SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID}-space-a`,
      spaceId: asSpaceId('space-a'),
    });
  });
});
