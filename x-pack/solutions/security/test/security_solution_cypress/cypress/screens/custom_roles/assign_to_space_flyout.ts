/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common';

export const SPACE_SELECTOR_COMBO_BOX = '[data-test-subj="spaceSelectorComboBox"]';

// Privileges
export const SECURITY_CATEGORY = '[data-test-subj="featureCategory_securitySolution"]';

// Sub-privileges
export const SECURITY_FEATURE = `[data-test-subj="featureCategory_securitySolution_${SECURITY_FEATURE_ID}"]`;
export const SECURITY_FEATURE_DESCRIPTION = '[data-test-subj="featurePrivilegeDescriptionText"]';
export const SECURITY_SUB_FEATURE_TABLE =
  '[data-test-subj="securitySolution_siemV5_subFeaturesTable"]';

export const SOC_MANAGEMENT_SUB_FEATURE =
  '[data-test-subj="securitySolution_siemV5_soc_management"]';

export const CASES_FEATURE =
  '[data-test-subj="featureCategory_securitySolution_securitySolutionCasesV3"]';
export const MACHINE_LEARNING_FEATURE = '[data-test-subj="featureCategory_securitySolution_ml"]';
export const ELASTIC_AI_ASSISTANT_FEATURE =
  '[data-test-subj="featureCategory_securitySolution_securitySolutionAssistant"]';
export const ATTACK_DISCOVERY_FEATURE =
  '[data-test-subj="featureCategory_securitySolution_securitySolutionAttackDiscovery"]';
export const TIMELINE_FEATURE =
  '[data-test-subj="featureCategory_securitySolution_securitySolutionTimeline"]';
export const NOTES_FEATURE =
  '[data-test-subj="featureCategory_securitySolution_securitySolutionNotes"]';
export const SIEM_MIGRATIONS_FEATURE =
  '[data-test-subj="featureCategory_securitySolution_securitySolutionSiemMigrations"]';
