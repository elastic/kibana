/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { isWorkflowsEnabled } from '@kbn/discoveries/impl/lib/helpers/is_workflows_enabled';

// ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING is defined in @kbn/security-solution-navigation but
// that package is not a declared dependency of the discoveries plugin. Inline the
// constant here rather than introduce a cross-boundary import.
const ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING = 'securitySolution:enableAttackDiscoveryWorkflows';

/**
 * Returns true only when BOTH the global feature flag
 * (`securitySolution.attackDiscoveryWorkflowsEnabled`) AND the per-space
 * Advanced Setting (`securitySolution:enableAttackDiscoveryWorkflows`) are enabled.
 *
 * Short-circuits: if the feature flag is off, the UI setting is never read.
 */
export const isWorkflowsEnabledForSpace = async ({
  featureFlags,
  uiSettingsClient,
}: {
  featureFlags: Pick<Parameters<typeof isWorkflowsEnabled>[0], 'getBooleanValue'>;
  uiSettingsClient: IUiSettingsClient;
}): Promise<boolean> => {
  if (!(await isWorkflowsEnabled(featureFlags))) return false;

  return (await uiSettingsClient.get<boolean>(ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING)) ?? false;
};
