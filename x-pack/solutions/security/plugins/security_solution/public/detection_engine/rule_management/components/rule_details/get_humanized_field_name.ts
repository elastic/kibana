/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

/**
 * This helper function returns a humanized name for non-grouped diffable fields
 */
// eslint-disable-next-line complexity
export const getHumanizedFieldName = (fieldName: string) => {
  switch (fieldName) {
    // About section fields
    case 'building_block':
      return i18n.BUILDING_BLOCK_FIELD_LABEL;
    case 'severity':
      return i18n.SEVERITY_FIELD_LABEL;
    case 'severity_mapping':
      return i18n.SEVERITY_MAPPING_FIELD_LABEL;
    case 'risk_score':
      return i18n.RISK_SCORE_FIELD_LABEL;
    case 'risk_score_mapping':
      return i18n.RISK_SCORE_MAPPING_FIELD_LABEL;
    case 'references':
      return i18n.REFERENCES_FIELD_LABEL;
    case 'false_positives':
      return i18n.FALSE_POSITIVES_FIELD_LABEL;
    case 'investigation_fields':
      return i18n.INVESTIGATION_FIELDS_FIELD_LABEL;
    case 'rule_name_override':
      return i18n.RULE_NAME_OVERRIDE_FIELD_LABEL;
    case 'threat':
      return i18n.THREAT_FIELD_LABEL;
    case 'threat_indicator_path':
      return i18n.THREAT_INDICATOR_PATH_LABEL;
    case 'timestamp_override':
      return i18n.TIMESTAMP_OVERRIDE_FIELD_LABEL;
    case 'max_signals':
      return i18n.MAX_SIGNALS_FIELD_LABEL;
    case 'tags':
      return i18n.TAGS_FIELD_LABEL;
    case 'setup':
      return i18n.SETUP_GUIDE_SECTION_LABEL;
    case 'note':
      return i18n.INVESTIGATION_GUIDE_TAB_LABEL;

    // Definition section fields
    case 'type':
      return i18n.RULE_TYPE_FIELD_LABEL;
    case 'anomaly_threshold':
      return i18n.ANOMALY_THRESHOLD_FIELD_LABEL;
    case 'machine_learning_job_id':
      return i18n.MACHINE_LEARNING_JOB_ID_FIELD_LABEL;
    case 'related_integrations':
      return i18n.RELATED_INTEGRATIONS_FIELD_LABEL;
    case 'required_fields':
      return i18n.REQUIRED_FIELDS_FIELD_LABEL;
    case 'timeline_template':
      return i18n.TIMELINE_TITLE_FIELD_LABEL;
    case 'threshold':
      return i18n.THRESHOLD_FIELD_LABEL;
    case 'threat_index':
      return i18n.THREAT_INDEX_FIELD_LABEL;
    case 'threat_mapping':
      return i18n.THREAT_MAPPING_FIELD_LABEL;
    case 'new_terms_fields':
      return i18n.NEW_TERMS_FIELDS_FIELD_LABEL;
    case 'history_window_start':
      return i18n.HISTORY_WINDOW_SIZE_FIELD_LABEL;

    default:
      return '';
  }
};
