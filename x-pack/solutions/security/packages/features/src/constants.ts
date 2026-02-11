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
// New version for 9.1.
export const SECURITY_FEATURE_ID_V3 = 'siemV3' as const;
// New version for 9.2.
export const SECURITY_FEATURE_ID_V4 = 'siemV4' as const;
// New version for 9.3.
export const SECURITY_FEATURE_ID_V5 = 'siemV5' as const;

// Security UI privileges
export const SECURITY_UI_SHOW = 'show' as const;
export const SECURITY_UI_SHOW_PRIVILEGE = `${SECURITY_FEATURE_ID_V5}.${SECURITY_UI_SHOW}` as const;
export const SECURITY_UI_CRUD = 'crud' as const;
export const SECURITY_UI_CRUD_PRIVILEGE = `${SECURITY_FEATURE_ID_V5}.${SECURITY_UI_CRUD}` as const;

/**
 * @deprecated deprecated in 8.17. Use CASE_FEATURE_ID_V2 instead
 */
export const CASES_FEATURE_ID = 'securitySolutionCases' as const;

// New version created in 8.17 to adopt the roles migration changes
export const CASES_FEATURE_ID_V2 = 'securitySolutionCasesV2' as const;

// New version created in 8.18 for case assignees
export const CASES_FEATURE_ID_V3 = 'securitySolutionCasesV3' as const;

export const SECURITY_SOLUTION_CASES_APP_ID = 'securitySolutionCases' as const;
export const EXCEPTIONS_SUBFEATURE_ID = 'securitySolutionExceptions' as const;

export const EXCEPTIONS_SUBFEATURE_ALL = 'security_solution_exceptions_all' as const;

export const ASSISTANT_FEATURE_ID = 'securitySolutionAssistant' as const;
export const ATTACK_DISCOVERY_FEATURE_ID = 'securitySolutionAttackDiscovery' as const;
export const TIMELINE_FEATURE_ID = 'securitySolutionTimeline' as const;
export const NOTES_FEATURE_ID = 'securitySolutionNotes' as const;
export const SIEM_MIGRATIONS_FEATURE_ID = 'securitySolutionSiemMigrations' as const;

export const SECURITY_SOLUTION_RULES_APP_ID = 'securitySolutionRules' as const;
export const RULES_FEATURE_ID_V1 = 'securitySolutionRulesV1' as const;
export const RULES_FEATURE_ID_V2 = 'securitySolutionRulesV2' as const;
export const RULES_FEATURE_LATEST = RULES_FEATURE_ID_V2;

// Rules API privileges
export const RULES_API_READ = 'rules-read' as const;
export const RULES_API_ALL = 'rules-all' as const;
export const ALERTS_API_READ = 'alerts-read' as const;
export const ALERTS_API_ALL = 'alerts-all' as const;
export const EXCEPTIONS_API_READ = 'exceptions-read' as const;
export const EXCEPTIONS_API_ALL = 'exceptions-all' as const;
export const LISTS_API_READ = 'lists-read' as const;
export const LISTS_API_ALL = 'lists-all' as const;
export const LISTS_API_SUMMARY = 'lists-summary' as const;
export const INITIALIZE_SECURITY_SOLUTION = 'initialize-security-solution' as const;
export const USERS_API_READ = 'users-read' as const;

// Rules UI privileges
export const RULES_UI_READ = 'read_rules' as const;
export const RULES_UI_DETECTIONS = 'detections' as const;
export const RULES_UI_EXTERNAL_DETECTIONS = 'external_detections' as const;
export const RULES_UI_READ_PRIVILEGE = `${RULES_FEATURE_ID_V2}.${RULES_UI_READ}` as const;
export const RULES_UI_EDIT = 'edit_rules' as const;
export const RULES_UI_EDIT_PRIVILEGE = `${RULES_FEATURE_ID_V2}.${RULES_UI_EDIT}` as const;
export const RULES_UI_DETECTIONS_PRIVILEGE =
  `${RULES_FEATURE_ID_V2}.${RULES_UI_DETECTIONS}` as const;
export const RULES_UI_EXTERNAL_DETECTIONS_PRIVILEGE =
  `${RULES_FEATURE_ID_V2}.${RULES_UI_EXTERNAL_DETECTIONS}` as const;
export const EXCEPTIONS_UI_READ = 'readExceptions' as const;
export const EXCEPTIONS_UI_EDIT = 'editExceptions' as const;
export const EXCEPTIONS_UI_READ_PRIVILEGES =
  `${RULES_FEATURE_ID_V2}.${EXCEPTIONS_UI_READ}` as const;
export const EXCEPTIONS_UI_EDIT_PRIVILEGES =
  `${RULES_FEATURE_ID_V2}.${EXCEPTIONS_UI_EDIT}` as const;

// Same as the plugin id defined by Cloud Security Posture
export const CLOUD_POSTURE_APP_ID = 'csp' as const;

// Same as the plugin id defined by Defend for containers (cloud_defend)
export const CLOUD_DEFEND_APP_ID = 'cloudDefend' as const;

/**
 * Id for the notifications alerting type
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
export const LEGACY_NOTIFICATIONS_ID = `siem.notifications` as const;
