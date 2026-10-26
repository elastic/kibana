/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconColor } from '@elastic/eui';
import { capitalize } from 'lodash';
import { assertUnreachable } from '../../../../../common/utility_types';
import type { RuleExecutionStatus } from '../../../../../common/api/detection_engine/rule_monitoring';
import { RuleExecutionStatusEnum } from '../../../../../common/api/detection_engine/rule_monitoring';

export const getStatusText = (value: RuleExecutionStatus | null | undefined): string | null => {
  if (value == null) {
    return null;
  }
  if (value === RuleExecutionStatusEnum['partial failure']) {
    return 'warning';
  }
  return value;
};

export const getCapitalizedStatusText = (
  value: RuleExecutionStatus | null | undefined
): string | null => {
  const status = getStatusText(value);
  return status != null ? capitalize(status) : null;
};

export const getStatusColor = (status: RuleExecutionStatus | null | undefined): IconColor => {
  if (status == null) {
    return 'subdued';
  }
  if (status === RuleExecutionStatusEnum.succeeded) {
    return 'success';
  }
  if (status === RuleExecutionStatusEnum.failed) {
    return 'danger';
  }
  if (
    status === RuleExecutionStatusEnum.running ||
    status === RuleExecutionStatusEnum['partial failure'] ||
    status === RuleExecutionStatusEnum['going to run']
  ) {
    return 'warning';
  }
  return assertUnreachable(status, 'Unknown rule execution status');
};
