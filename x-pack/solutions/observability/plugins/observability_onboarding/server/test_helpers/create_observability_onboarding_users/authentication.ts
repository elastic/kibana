/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MONITOR_CLUSTER, INDEX_LOGS_AND_METRICS } from '../../lib/api_key/privileges';

export enum ObservabilityOnboardingUsername {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  editorUser = 'editor',
  logMonitoringUser = 'log_monitoring_user',
}

export enum ObservabilityOnboardingCustomRolename {
  logMonitoringUser = 'log_monitoring_user',
}

export const customRoles = {
  [ObservabilityOnboardingCustomRolename.logMonitoringUser]: {
    elasticsearch: {
      cluster: [MONITOR_CLUSTER, 'manage_own_api_key'],
      indices: [INDEX_LOGS_AND_METRICS],
    },
  },
};

export const users: Record<
  ObservabilityOnboardingUsername,
  {
    builtInRoleNames?: string[];
    customRoleNames?: ObservabilityOnboardingCustomRolename[];
  }
> = {
  [ObservabilityOnboardingUsername.noAccessUser]: {},
  [ObservabilityOnboardingUsername.viewerUser]: {
    builtInRoleNames: ['viewer'],
  },
  [ObservabilityOnboardingUsername.editorUser]: {
    builtInRoleNames: ['editor'],
  },
  [ObservabilityOnboardingUsername.logMonitoringUser]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [ObservabilityOnboardingCustomRolename.logMonitoringUser],
  },
};

export const OBSERVABILITY_ONBOARDING_TEST_PASSWORD = 'changeme';
