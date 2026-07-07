/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { RuleExecutorOptions, RuleType, RuleTypeState } from '@kbn/alerting-plugin/server';
import type { AttackDiscoveryAlertDocument, AttackDiscoveryScheduleContext } from '../types';

export const AttackPromotionParams = z.object({
  attackIds: z.array(z.string()),
});

export type AttackPromotionParams = z.infer<typeof AttackPromotionParams>;

export type AttackPromotionExecutorOptions = RuleExecutorOptions<
  AttackPromotionParams,
  RuleTypeState,
  {},
  AttackDiscoveryScheduleContext,
  'default',
  AttackDiscoveryAlertDocument
>;

export type AttackPromotionRuleType = RuleType<
  AttackPromotionParams,
  never,
  RuleTypeState,
  {},
  AttackDiscoveryScheduleContext,
  'default',
  never,
  AttackDiscoveryAlertDocument
>;
