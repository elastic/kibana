/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { RuleExecutionEventType } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { RuleExecutionEventTypeEnum } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { assertUnreachable } from '../../../../../../../common/utility_types';

import * as i18n from './translations';

export const getBadgeIcon = (type: RuleExecutionEventType): IconType => {
  switch (type) {
    case RuleExecutionEventTypeEnum.message:
      return 'comment';
    case RuleExecutionEventTypeEnum['status-change']:
      return 'dot';
    case RuleExecutionEventTypeEnum['execution-metrics']:
      return 'stats';
    default:
      return assertUnreachable(type, 'Unknown rule execution event type');
  }
};

export const getBadgeText = (type: RuleExecutionEventType): string => {
  switch (type) {
    case RuleExecutionEventTypeEnum.message:
      return i18n.TYPE_MESSAGE;
    case RuleExecutionEventTypeEnum['status-change']:
      return i18n.TYPE_STATUS_CHANGE;
    case RuleExecutionEventTypeEnum['execution-metrics']:
      return i18n.TYPE_EXECUTION_METRICS;
    default:
      return assertUnreachable(type, 'Unknown rule execution event type');
  }
};
