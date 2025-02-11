/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Same as the plugin id defined by Security Solution
export const APP_ID = 'securitySolution' as const;
export const SERVER_APP_ID = 'siem' as const;

// New version created in 8.18. It was previously `SERVER_APP_ID`.
export const SECURITY_FEATURE_ID_V2 = 'siemV2' as const;

/**
 * @deprecated deprecated in 8.17. Use CASE_FEATURE_ID_V2 instead
 */
export const CASES_FEATURE_ID = 'securitySolutionCases' as const;

// New version created in 8.17 to adopt the roles migration changes
export const CASES_FEATURE_ID_V2 = 'securitySolutionCasesV2' as const;

// New version created in 8.18 for case assignees
export const CASES_FEATURE_ID_V3 = 'securitySolutionCasesV3' as const;

export const SECURITY_SOLUTION_CASES_APP_ID = 'securitySolutionCases' as const;

export const ASSISTANT_FEATURE_ID = 'securitySolutionAssistant' as const;
export const ATTACK_DISCOVERY_FEATURE_ID = 'securitySolutionAttackDiscovery' as const;
export const TIMELINE_FEATURE_ID = 'securitySolutionTimeline' as const;
export const NOTES_FEATURE_ID = 'securitySolutionNotes' as const;
export const SIEM_MIGRATIONS_FEATURE_ID = 'securitySolutionSiemMigrations' as const;

// Same as the plugin id defined by Cloud Security Posture
export const CLOUD_POSTURE_APP_ID = 'csp' as const;

// Same as the plugin id defined by Defend for containers (cloud_defend)
export const CLOUD_DEFEND_APP_ID = 'cloudDefend' as const;

/**
 * Id for the notifications alerting type
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const LEGACY_NOTIFICATIONS_ID = `siem.notifications` as const;
