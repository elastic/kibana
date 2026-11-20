/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asSpaceId, brandSpaceId } from '@kbn/core-spaces-common';
import {
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { shouldRestoreSettingsBackedWorkflow } from './feature_settings';

describe('shouldRestoreSettingsBackedWorkflow', () => {
  it('always restores a recorded continuous onboarding document, ignoring the legacy flag', () => {
    const workflow = {
      id: `${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-space-a`,
      spaceId: asSpaceId('space-a'),
    };
    expect(
      shouldRestoreSettingsBackedWorkflow(workflow, {
        continuousOnboardingWasEnabled: false,
        scheduledDiscoveryEnabledSpaceIds: [],
      })
    ).toBe(true);
    expect(shouldRestoreSettingsBackedWorkflow(workflow, undefined)).toBe(true);
  });

  it('restores scheduled discovery only for spaces that were previously enabled', () => {
    const scheduledId = `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`;
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: scheduledId, spaceId: asSpaceId('space-a') },
        {
          continuousOnboardingWasEnabled: false,
          scheduledDiscoveryEnabledSpaceIds: [asSpaceId('space-a')],
        }
      )
    ).toBe(true);
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: scheduledId, spaceId: asSpaceId('space-b') },
        {
          continuousOnboardingWasEnabled: false,
          scheduledDiscoveryEnabledSpaceIds: [asSpaceId('space-a')],
        }
      )
    ).toBe(false);
  });

  it('always restores workflows that are not gated by Settings toggles', () => {
    expect(
      shouldRestoreSettingsBackedWorkflow(
        { id: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID, spaceId: brandSpaceId('*') },
        { continuousOnboardingWasEnabled: false, scheduledDiscoveryEnabledSpaceIds: [] }
      )
    ).toBe(true);
    expect(
      shouldRestoreSettingsBackedWorkflow(
        {
          id: `${SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID}-space-a`,
          spaceId: asSpaceId('space-a'),
        },
        { continuousOnboardingWasEnabled: false, scheduledDiscoveryEnabledSpaceIds: [] }
      )
    ).toBe(true);
  });

  it('does not restore settings-backed workflows when pausedSettings is missing', () => {
    expect(
      shouldRestoreSettingsBackedWorkflow(
        {
          id: `${SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID}-default`,
          spaceId: asSpaceId('default'),
        },
        undefined
      )
    ).toBe(false);
  });
});
