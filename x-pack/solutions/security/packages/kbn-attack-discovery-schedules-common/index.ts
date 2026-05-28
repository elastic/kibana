/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ATTACK_DISCOVERY_ALERTS_AAD_CONFIG,
  ATTACK_DISCOVERY_ALERTS_CONTEXT,
  SECURITY_APP_PATH,
} from './impl/constants';

export {
  AttackDiscoveryScheduleDataClient,
  type AttackDiscoveryScheduleDataClientParams,
  type CreateAttackDiscoveryScheduleDataClientParams,
  type FilterTags,
} from './impl/data_client';

export { attackDiscoveryAlertFieldMap } from './impl/fields/field_map';

export {
  ALERT_ATTACK_DISCOVERY,
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_ACTION_TYPE_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_CONNECTOR_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_MODEL,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_PROVIDER,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS_UUID,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS_VALUE,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_ATTACK_DISCOVERY_USERS_ID,
  ALERT_ATTACK_DISCOVERY_USERS_NAME,
  ALERT_ATTACK_IDS,
  ALERT_RISK_SCORE,
} from './impl/fields/field_names';

export { AttackDiscoveryScheduleParamsExtended } from './impl/schedule_params_extended';

export {
  convertAlertingRuleToSchedule,
  convertScheduleActionsToAlertingActions,
  createScheduleExecutionSummary,
  generateAttackDiscoveryAlertHash,
  transformToBaseAlertDocument,
  type AttackDiscoveryAlertDocumentBase,
} from './impl/transforms';

export {
  ALERTS_INDEX_PATTERN,
  updateAlertsWithAttackIds,
  type UpdateAlertsWithAttackIdsParams,
} from './impl/update_alerts_with_attack_ids';

export type {
  AttackDiscoveryAlertDocument,
  AttackDiscoveryExecutorOptions,
  AttackDiscoveryScheduleContext,
  AttackDiscoveryScheduleFindOptions,
  AttackDiscoveryScheduleSort,
  AttackDiscoveryScheduleType,
} from './impl/types';
