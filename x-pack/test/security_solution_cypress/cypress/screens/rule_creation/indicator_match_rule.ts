/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INDICATOR_MATCH_TYPE = '[data-test-subj="threatMatchRuleType"]';

export const AT_LEAST_ONE_INDEX_PATTERN = 'A minimum of one index pattern is required.';

export const INVALID_MATCH_CONTENT = 'All matches require both a field and threat index field.';

export const AT_LEAST_ONE_VALID_MATCH = 'At least one indicator match is required.';

export const THREAT_MAPPING_COMBO_BOX_INPUT =
  '[data-test-subj="threatMatchInput"] [data-test-subj="fieldAutocompleteComboBox"]';

export const THREAT_MATCH_CUSTOM_QUERY_INPUT =
  '[data-test-subj="detectionEngineStepDefineRuleQueryBar"] [data-test-subj="queryInput"]';

export const THREAT_MATCH_QUERY_INPUT =
  '[data-test-subj="detectionEngineStepDefineThreatRuleQueryBar"] [data-test-subj="queryInput"]';

export const THREAT_MATCH_INDICATOR_INDEX =
  '[data-test-subj="detectionEngineStepDefineRuleIndices"] [data-test-subj="comboBoxInput"]';

export const THREAT_MATCH_INDICATOR_INDICATOR_INDEX =
  '[data-test-subj="detectionEngineStepDefineRuleThreatMatchIndices"] [data-test-subj="comboBoxInput"]';

export const THREAT_MATCH_AND_BUTTON = '[data-test-subj="andButton"]';

export const THREAT_ITEM_ENTRY_DELETE_BUTTON = '[data-test-subj="itemEntryDeleteButton"]';

export const THREAT_MATCH_OR_BUTTON = '[data-test-subj="orButton"]';

export const THREAT_COMBO_BOX_INPUT =
  '[data-test-subj="stepDefineRule"] [data-test-subj="fieldAutocompleteComboBox"]';
