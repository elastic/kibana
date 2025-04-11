/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutorOptions, RuleType, RuleTypeState } from '@kbn/alerting-plugin/server';
import { SecurityAttackDiscoveryAlert } from '@kbn/alerts-as-data-utils';
import { AttackDiscoveryScheduleParams } from '@kbn/elastic-assistant-common';
import { ALERT_ATTACK_DISCOVERY_USERS } from './fields';

/**
 * This is a WORKAROUND until the `createSchemaFromFieldMap` can handle complex mappings.
 * Right now that tool cannot properly handle the combination of optional and required fields within the same nested/object field type.
 * Instead of creating an intersection type it generates a separate fields in required and optional sections as separate flattened fields.
 * As a workaround, we strip out incorrectly generated fields and re-add them in a correct format.
 */
export type AttackDiscoveryAlert = Omit<
  SecurityAttackDiscoveryAlert,
  | 'kibana.alert.attack_discovery.users'
  | 'kibana.alert.attack_discovery.users.id'
  | 'kibana.alert.attack_discovery.users.name'
> & {
  [ALERT_ATTACK_DISCOVERY_USERS]?: {
    id?: string;
    name: string;
  };
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
