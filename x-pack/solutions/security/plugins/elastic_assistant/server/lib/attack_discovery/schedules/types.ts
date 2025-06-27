/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  AlertInstanceContext,
  RuleExecutorOptions,
  RuleType,
  RuleTypeState,
} from '@kbn/alerting-plugin/server';
import { SecurityAttackDiscoveryAlert } from '@kbn/alerts-as-data-utils';
import { AttackDiscoveryScheduleParams } from '@kbn/elastic-assistant-common';
import { ALERT_WORKFLOW_STATUS_UPDATED_AT } from '@kbn/rule-data-utils';
import {
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USERS,
} from './fields';

/**
 * This is a WORKAROUND until the `createSchemaFromFieldMap` can handle complex mappings.
 * Right now that tool cannot properly handle the combination of optional and required fields within the same nested/object field type.
 * Instead of creating an intersection type it generates a separate fields in required and optional sections as separate flattened fields.
 * As a workaround, we strip out incorrectly generated fields and re-add them in a correct format.
 */
export type AttackDiscoveryAlertDocument = Omit<
  SecurityAttackDiscoveryAlert,
  | 'kibana.alert.attack_discovery.api_config'
  | 'kibana.alert.attack_discovery.api_config.action_type_id'
  | 'kibana.alert.attack_discovery.api_config.connector_id'
  | 'kibana.alert.attack_discovery.api_config.model'
  | 'kibana.alert.attack_discovery.api_config.name'
  | 'kibana.alert.attack_discovery.api_config.provider'
  | 'kibana.alert.attack_discovery.replacements'
  | 'kibana.alert.attack_discovery.replacements.value'
  | 'kibana.alert.attack_discovery.replacements.uuid'
  | 'kibana.alert.attack_discovery.users'
  | 'kibana.alert.attack_discovery.users.id'
  | 'kibana.alert.attack_discovery.users.name'
> & {
  [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
    action_type_id: string;
    connector_id: string;
    model?: string;
    name: string;
    provider?: string;
  };
  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]?: Array<{
    value: string;
    uuid: string;
  }>;
  [ALERT_ATTACK_DISCOVERY_USERS]?: Array<{
    id?: string;
    name: string;
  }>;
  [ALERT_WORKFLOW_STATUS_UPDATED_AT]?: string;
};

export type AttackDiscoveryScheduleContext = AlertInstanceContext & {
  attack: {
    alertIds: string[];
    detailsMarkdown: string;
    detailsUrl?: string;
    entitySummaryMarkdown?: string;
    mitreAttackTactics?: string[];
    summaryMarkdown: string;
    timestamp?: string;
    title: string;
  };
};

export type AttackDiscoveryExecutorOptions = RuleExecutorOptions<
  AttackDiscoveryScheduleParams,
  RuleTypeState,
  {},
  AttackDiscoveryScheduleContext,
  'default',
  AttackDiscoveryAlertDocument
>;

export type AttackDiscoveryScheduleType = RuleType<
  AttackDiscoveryScheduleParams,
  never,
  RuleTypeState,
  {},
  AttackDiscoveryScheduleContext,
  'default',
  never,
  AttackDiscoveryAlertDocument
>;

export interface AttackDiscoveryScheduleSort {
  sortDirection?: estypes.SortOrder;
  sortField?: string;
}

export interface AttackDiscoveryScheduleFindOptions {
  page?: number;
  perPage?: number;
  sort?: AttackDiscoveryScheduleSort;
}
