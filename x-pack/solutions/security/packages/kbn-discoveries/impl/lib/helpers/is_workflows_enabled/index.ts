/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { CoreStart } from '@kbn/core/server';

export const ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG =
  'securitySolution.attackDiscoveryWorkflowsEnabled' as const;

type WorkflowsFeatureFlags =
  | Pick<CoreStart['featureFlags'], 'getBooleanValue$'>
  | {
      getBooleanValue(flagName: string, fallbackValue: boolean): Promise<boolean>;
    };

/**
 * Reads the `attackDiscoveryWorkflowsEnabled` feature flag. Start-contract callers
 * subscribe to `getBooleanValue$`. HTTP request-handler context only exposes
 * `getBooleanValue`, so that path stays on the request-scoped evaluation.
 */
export const isWorkflowsEnabled = (featureFlags: WorkflowsFeatureFlags): Promise<boolean> => {
  if ('getBooleanValue$' in featureFlags) {
    return firstValueFrom(
      featureFlags.getBooleanValue$(ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG, true)
    );
  }

  return featureFlags.getBooleanValue(ATTACK_DISCOVERY_WORKFLOWS_ENABLED_FEATURE_FLAG, true);
};
