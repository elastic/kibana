/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertConsumers,
  STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
  OBSERVABILITY_RULE_TYPE_IDS,
} from '@kbn/rule-data-utils';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { RuleCreationValidConsumer } from '@kbn/triggers-actions-ui-plugin/public';

export const INVALID_EQUATION_REGEX = /[^A-Z|+|\-|\s|\d+|\.|\(|\)|\/|\*|>|<|=|\?|\:|&|\!|\|]+/g;
export const ALERT_STATUS_ALL = 'all';
export const ALERTS_URL_STORAGE_KEY = '_a';

export const observabilityAlertFeatureIds: ValidFeatureId[] = [
  AlertConsumers.APM,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.UPTIME,
  AlertConsumers.SLO,
  AlertConsumers.OBSERVABILITY,
  AlertConsumers.ALERTS,
];

export const observabilityRuleCreationValidConsumers: RuleCreationValidConsumer[] = [
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.OBSERVABILITY,
];

export const EventsAsUnit = 'events';

export const OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES = [
  ...OBSERVABILITY_RULE_TYPE_IDS,
  ...STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
];
