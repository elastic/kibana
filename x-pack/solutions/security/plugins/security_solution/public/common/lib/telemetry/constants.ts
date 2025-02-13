/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { METRIC_TYPE } from '@kbn/analytics';

export enum TELEMETRY_EVENT {
  // Detections
  SIEM_RULE_ENABLED = 'siem_rule_enabled',
  SIEM_RULE_DISABLED = 'siem_rule_disabled',
  CUSTOM_RULE_ENABLED = 'custom_rule_enabled',
  CUSTOM_RULE_DISABLED = 'custom_rule_disabled',
  // ML
  SIEM_JOB_ENABLED = 'siem_job_enabled',
  SIEM_JOB_DISABLED = 'siem_job_disabled',
  CUSTOM_JOB_ENABLED = 'custom_job_enabled',
  CUSTOM_JOB_DISABLED = 'custom_job_disabled',
  JOB_ENABLE_FAILURE = 'job_enable_failure',
  JOB_DISABLE_FAILURE = 'job_disable_failure',

  // Timeline
  TIMELINE_OPENED = 'open_timeline',
  TIMELINE_SAVED = 'timeline_saved',
  TIMELINE_NAMED = 'timeline_named',

  // UI Interactions
  TAB_CLICKED = 'tab_',

  // Landing pages
  LANDING_CARD = 'landing_card_',
  // Landing page - dashboard
  DASHBOARD = 'navigate_to_dashboard',
  CREATE_DASHBOARD = 'create_dashboard',

  ONBOARDING = 'onboarding',

  // value list
  OPEN_VALUE_LIST_MODAL = 'open_value_list_modal',
  CREATE_VALUE_LIST_ITEM = 'create_value_list_item',
  DELETE_VALUE_LIST_ITEM = 'delete_value_list_item',
  EDIT_VALUE_LIST_ITEM = 'edit_value_list_item',
  ADDITIONAL_UPLOAD_VALUE_LIST_ITEM = 'additinonal_upload_value_list_item',

  // Bulk custom highlighted fields action
  ADD_INVESTIGATION_FIELDS = 'add_investigation_fields',
  SET_INVESTIGATION_FIELDS = 'set_investigation_fields',
  DELETE_INVESTIGATION_FIELDS = 'delete_investigation_fields',

  // AI assistant on rule creation form
  OPEN_ASSISTANT_ON_RULE_QUERY_ERROR = 'open_assistant_on_rule_query_error',
}
