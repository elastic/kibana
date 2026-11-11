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
  NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  ALL_INSTALLABLE_WORKFLOW_IDS,
  BOUND_ENTRY_POINT_WORKFLOW_IDS,
  buildCancelTargets,
  buildDisableTargets,
  GLOBAL_CORE_WORKFLOW_IDS,
  isInstalledWorkflowDocumentId,
  SCHEDULED_MAINTENANCE_WORKFLOW_IDS,
} from './managed_workflow_targets';

describe('managed_workflow_targets registry', () => {
  it('includes every installable workflow id in the cancel sweep', () => {
    const cancelledIds = new Set(
      buildCancelTargets([asSpaceId('space-a')]).map(({ id }) => id.replace(/-space-a$/, ''))
    );

    for (const id of ALL_INSTALLABLE_WORKFLOW_IDS) {
      expect(cancelledIds.has(id)).toBe(true);
    }
  });

  it('tracks continuous onboarding, sync and cleanup as per-space scheduled workflows', () => {
    expect(SCHEDULED_MAINTENANCE_WORKFLOW_IDS).toEqual(
      expect.arrayContaining([
        NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
        NIGHTSHIFT_BOUND_KI_SYNC_WORKFLOW_ID,
        NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
      ])
    );
    expect(buildDisableTargets([asSpaceId('space-a')])).toContainEqual({
      id: `${NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID}-space-a`,
      spaceId: asSpaceId('space-a'),
    });
  });

  it('only disables per-space documents, never the global workflows', () => {
    const disabledIds = buildDisableTargets([asSpaceId('space-a')]).map(({ id }) => id);

    for (const id of [...GLOBAL_CORE_WORKFLOW_IDS, ...BOUND_ENTRY_POINT_WORKFLOW_IDS]) {
      expect(disabledIds).not.toContain(id);
    }
  });

  it('cancels the global workflows by id and the bound entry points by per-space document id', () => {
    const targets = buildCancelTargets([asSpaceId('space-a'), asSpaceId('space-b')]);

    for (const spaceId of ['space-a', 'space-b']) {
      for (const id of GLOBAL_CORE_WORKFLOW_IDS) {
        expect(targets).toContainEqual({ id, spaceId });
      }
      expect(targets).toContainEqual({
        id: `${NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID}-${spaceId}`,
        spaceId,
      });
    }
  });

  it('recognises per-space documents of installed workflows and drops ids of removed ones', () => {
    expect(
      isInstalledWorkflowDocumentId(`${NIGHTSHIFT_BOUND_ORCHESTRATOR_WORKFLOW_ID}-space-a`)
    ).toBe(true);
    expect(isInstalledWorkflowDocumentId(GLOBAL_CORE_WORKFLOW_IDS[0])).toBe(true);
    expect(isInstalledWorkflowDocumentId('system-streams-ki-sync-space-a')).toBe(false);
    expect(isInstalledWorkflowDocumentId('system-nightshift-scheduled-detection-space-a')).toBe(
      false
    );
  });
});
