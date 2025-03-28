/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultAlert } from '@kbn/alerts-as-data-utils';
import { RuleExecutorOptions, RuleType, RuleTypeState } from '@kbn/alerting-plugin/server';
import { AttackDiscoveryScheduleParams } from '@kbn/elastic-assistant-common';
import {
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_RISK_SCORE,
} from './fields';

export type AttackDiscoveryAlert = DefaultAlert & {
  [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]?: number;
  [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: string[];
  [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
    action_type_id: string;
    connector_id: string;
    model?: string;
    name: string;
    provider?: string;
  };
  [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: string;
  [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]: string;
  [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]?: string;
  [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]?: string;
  [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]?: string[];
  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]?: Array<{
    value?: string;
    uuid?: string;
  }>;
  [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: string;
  [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]: string;
  [ALERT_ATTACK_DISCOVERY_TITLE]: string;
  [ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS]: string;
  [ALERT_ATTACK_DISCOVERY_USER_ID]?: string;
  [ALERT_ATTACK_DISCOVERY_USERS]: Array<{
    id?: string;
    name?: string;
  }>;
  [ALERT_RISK_SCORE]?: number;
};

export type AttackDiscoveryExecutorOptions = RuleExecutorOptions<
  AttackDiscoveryScheduleParams,
  RuleTypeState,
  {},
  {},
  'default',
  AttackDiscoveryAlert
>;

export type AttackDiscoveryScheduleType = RuleType<
  AttackDiscoveryScheduleParams,
  never,
  RuleTypeState,
  {},
  {},
  'default',
  never,
  AttackDiscoveryAlert
>;
