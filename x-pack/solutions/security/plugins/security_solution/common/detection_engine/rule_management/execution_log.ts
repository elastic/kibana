/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionStatus, RuleRunType } from '../../api/detection_engine/rule_monitoring';
import {
  RuleExecutionStatusEnum,
  RuleRunTypeEnum,
} from '../../api/detection_engine/rule_monitoring';

export const RUN_TYPE_FILTERS: RuleRunType[] = [RuleRunTypeEnum.standard, RuleRunTypeEnum.backfill];

export const STATUS_FILTERS: RuleExecutionStatus[] = [
  RuleExecutionStatusEnum.succeeded,
  RuleExecutionStatusEnum.failed,
  RuleExecutionStatusEnum['partial failure'],
];
