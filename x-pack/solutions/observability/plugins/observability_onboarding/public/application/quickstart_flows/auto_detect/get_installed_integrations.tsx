/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallIntegrationsStepPayload } from '../../../../server/routes/types';
import type { ObservabilityOnboardingFlow } from '../../../../server/saved_objects/observability_onboarding_status';
import type { InstalledIntegration } from '../../../../server/routes/types';

export function getInstalledIntegrations(
  data: Pick<ObservabilityOnboardingFlow, 'progress'> | undefined
): InstalledIntegration[] {
  return (data?.progress['install-integrations']?.payload as InstallIntegrationsStepPayload) ?? [];
}
