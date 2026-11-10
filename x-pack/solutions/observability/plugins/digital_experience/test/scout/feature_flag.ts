/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Forces `digitalExperience.enabled` on, whatever LaunchDarkly serves the deployment. */
export const FLAG_ON_OVERRIDE = {
  'feature_flags.overrides': { 'digitalExperience.enabled': true },
} as const;

/** Forces `digitalExperience.enabled` off, whatever LaunchDarkly serves the deployment. */
export const FLAG_OFF_OVERRIDE = {
  'feature_flags.overrides': { 'digitalExperience.enabled': false },
} as const;

/** Removes the override, so the deployment gets its own flag value back. */
export const FLAG_RESET_OVERRIDE = {
  'feature_flags.overrides': { 'digitalExperience.enabled': null },
} as const;

/**
 * The override the global setup leaves in place, for a flag-off spec to restore: on locally,
 * where the flag-on specs run, and none on Cloud, where they don't.
 */
export const getGlobalFlagOverride = ({ isCloud }: { isCloud: boolean }) => {
  return isCloud ? FLAG_RESET_OVERRIDE : FLAG_ON_OVERRIDE;
};
