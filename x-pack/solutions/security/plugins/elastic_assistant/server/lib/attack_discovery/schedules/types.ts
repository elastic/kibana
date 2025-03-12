/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultAlert } from '@kbn/alerts-as-data-utils';
import { Provider, Replacements } from '@kbn/elastic-assistant-common';
import { RuleExecutorOptions, RuleType, RuleTypeState } from '@kbn/alerting-plugin/server';
import {
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_USERS,
} from './field_names';
import { RuleParams } from '.';

export type AttackDiscoveryAlert = DefaultAlert & {
  [ALERT_ATTACK_DISCOVERY_USERS]: Array<{
    alert_ids: string[];
    title: string;
    timestamp: string;
    details_markdown: string;
    entity_summary_markdown?: string;
    mitre_attack_tactics?: string[];
    summary_markdown: string;
    id?: string;
  }>;
  [ALERT_ATTACK_DISCOVERY_TITLE]: string;
  [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: string;
  [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: string;
  [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: string;
  [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]?: string[];
  [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: string[];
  [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]?: Replacements;
  [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
    action_type_id: string;
    connector_id: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]?: number;
};

export type AttackDiscoveryExecutorOptions = RuleExecutorOptions<
  RuleParams,
  RuleTypeState,
  {},
  {},
  'default',
  AttackDiscoveryAlert
>;

export type AttackDiscoveryRuleType = RuleType<
  RuleParams,
  never,
  RuleTypeState,
  {},
  {},
  'default',
  never,
  AttackDiscoveryAlert
>;
